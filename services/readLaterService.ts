import { supabase } from '../utils/supabase';
import type { Article, ArticleImage, PaginationParams, PaginatedArticles } from '../types/article';

/**
 * 稍后阅读服务
 */
export class ReadLaterService {
  private static STORAGE_BUCKET = 'article-images';
  private static FILES_BUCKET = 'article-files'; // 用于存储 HTML/PDF 文件

  /**
   * 保存文章到稍后阅读（使用 upsert）
   */
  static async saveArticle(
    article: Article,
    htmlBlob?: Blob,
    pdfBlob?: Blob
  ): Promise<{ success: boolean; error?: string; articleId?: string }> {
    try {
      // 1. 检查是否已存在相同 URL 的文章
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('url', article.url)
        .single();

      const isUpdate = !!existingArticle;
      const articleId = existingArticle?.id;

      // 2. 如果是更新，先删除旧的图片和文件
      if (isUpdate && articleId) {
        await this.deleteArticleImages(articleId);
        await this.deleteArticleFiles(articleId);
      }

      // 3. 处理内容中的图片（提取 base64 和外链图片，并替换为占位符）
      const { processedContent, extractedImages, coverImage } = await this.processContentImages(
        article.content,
        article.url
      );

      // 4. 先保存文章（使用带占位符的内容）
      const articleData = {
        title: article.title,
        url: article.url,
        author: article.author,
        published_date: article.published_date,
        length: article.length,
        language: article.language,
        summary: article.summary,
        ai_summary: article.ai_summary,
        content: processedContent, // 带占位符的内容
        content_text: article.content_text,
        cover_image: coverImage, // 可能是 URL 或 uniqueId
      };

      const { data: savedArticle, error: articleError } = await supabase
        .from('articles')
        .upsert(articleData, { onConflict: 'url' })
        .select()
        .single();

      if (articleError) {
        console.error('保存文章失败:', articleError);
        return { success: false, error: articleError.message };
      }

      const finalArticleId = savedArticle.id;

      // 5. 保存图片到 Storage 并获取 URL 映射
      let finalContent = processedContent;
      let finalCoverImage = coverImage;
      
      if (extractedImages.length > 0) {
        const urlMapping = await this.saveArticleImages(finalArticleId, extractedImages);
        
        // 6. 替换 content 中的占位符为真实 URL
        for (const [uniqueId, storageUrl] of Object.entries(urlMapping)) {
          finalContent = finalContent.replace(new RegExp(`\\{\\{${uniqueId}\\}\\}`, 'g'), storageUrl);
          
          // 如果封面图是 uniqueId，也替换它
          if (finalCoverImage === uniqueId) {
            finalCoverImage = storageUrl;
          }
        }

        // 7. 更新文章的 content 和 cover_image
        await supabase
          .from('articles')
          .update({
            content: finalContent,
            cover_image: finalCoverImage,
          })
          .eq('id', finalArticleId);
      }

      // 8. 保存 HTML 文件
      if (htmlBlob) {
        await this.saveArticleFile(finalArticleId, htmlBlob, 'html');
      }

      // 9. 保存 PDF 文件
      if (pdfBlob) {
        await this.saveArticleFile(finalArticleId, pdfBlob, 'pdf');
      }

      return { success: true, articleId: finalArticleId };
    } catch (error) {
      console.error('保存文章时发生错误:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 处理内容中的图片（提取 base64 和外链图片，并替换为占位符）
   */
  private static async processContentImages(
    content: string,
    baseUrl: string
  ): Promise<{ processedContent: string; extractedImages: ArticleImage[]; coverImage?: string }> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images: ArticleImage[] = [];
    const imageElements = doc.querySelectorAll('img');
    let coverImage: string | undefined;

    for (let i = 0; i < imageElements.length; i++) {
      const img = imageElements[i];
      const src = img.src || img.getAttribute('data-src') || '';

      if (!src) continue;

      // 处理 base64 图片
      if (src.startsWith('data:image/')) {
        try {
          // 将 base64 转为 blob
          const blob = await this.base64ToBlob(src);
          const fileExt = this.getMimeTypeExtension(blob.type) || 'png';
          
          // 生成唯一 ID 作为占位符
          const uniqueId = `base64-image-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          images.push({
            original_url: src,
            alt_text: img.alt || '',
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined,
            blob, // 临时存储 blob，稍后上传
            fileExt,
            uniqueId, // 用于后续替换
          } as any);

          // 替换为占位符，稍后会替换为真实 URL
          img.setAttribute('src', `{{${uniqueId}}}`);
          img.removeAttribute('data-src');

          // 第一张图片作为封面
          if (!coverImage && i === 0) {
            coverImage = uniqueId; // 临时使用 uniqueId，稍后会被替换
          }
        } catch (error) {
          console.error('处理 base64 图片失败:', error);
        }
      }
      // 处理外链图片
      else if (src.startsWith('http')) {
        images.push({
          original_url: src,
          alt_text: img.alt || '',
          width: img.naturalWidth || undefined,
          height: img.naturalHeight || undefined,
        });

        // 第一张图片作为封面
        if (!coverImage && i === 0) {
          coverImage = src;
        }
      }
      // 处理相对路径
      else {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          images.push({
            original_url: absoluteUrl,
            alt_text: img.alt || '',
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined,
          });

          if (!coverImage && i === 0) {
            coverImage = absoluteUrl;
          }
        } catch {
          console.warn('无法解析相对路径:', src);
        }
      }
    }

    // 同时处理 video 和 audio 标签的 base64 资源
    const videoElements = doc.querySelectorAll('video');
    for (const video of Array.from(videoElements)) {
      const src = video.getAttribute('src') || '';
      const poster = video.getAttribute('poster') || '';

      // 处理 base64 视频源
      if (src && src.startsWith('data:video/')) {
        try {
          const blob = await this.base64ToBlob(src);
          const uniqueId = `base64-video-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          images.push({
            original_url: src,
            alt_text: 'Video',
            blob,
            fileExt: 'mp4',
            uniqueId,
          } as any);

          video.setAttribute('src', `{{${uniqueId}}}`);
        } catch (error) {
          console.error('处理 base64 视频失败:', error);
        }
      }

      // 处理 base64 poster 图片
      if (poster && poster.startsWith('data:image/')) {
        try {
          const blob = await this.base64ToBlob(poster);
          const fileExt = this.getMimeTypeExtension(blob.type) || 'png';
          const uniqueId = `base64-poster-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          images.push({
            original_url: poster,
            alt_text: 'Video poster',
            blob,
            fileExt,
            uniqueId,
          } as any);

          video.setAttribute('poster', `{{${uniqueId}}}`);
        } catch (error) {
          console.error('处理 poster 图片失败:', error);
        }
      }
    }

    // 处理 audio 标签
    const audioElements = doc.querySelectorAll('audio');
    for (const audio of Array.from(audioElements)) {
      const src = audio.getAttribute('src') || '';

      if (src && src.startsWith('data:audio/')) {
        try {
          const blob = await this.base64ToBlob(src);
          const uniqueId = `base64-audio-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          images.push({
            original_url: src,
            alt_text: 'Audio',
            blob,
            fileExt: 'mp3',
            uniqueId,
          } as any);

          audio.setAttribute('src', `{{${uniqueId}}}`);
        } catch (error) {
          console.error('处理 base64 音频失败:', error);
        }
      }
    }

    return {
      processedContent: doc.body.innerHTML,
      extractedImages: images,
      coverImage,
    };
  }

  /**
   * 将 base64 转为 Blob
   */
  private static async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(base64);
    return await response.blob();
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  private static getMimeTypeExtension(mimeType: string): string | null {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
    };
    return mimeMap[mimeType] || null;
  }

  /**
   * 删除文章的所有图片
   */
  private static async deleteArticleImages(articleId: string): Promise<void> {
    try {
      // 删除 Storage 中该文章目录下的所有文件
      const { data: files } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list(articleId);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${articleId}/${file.name}`);
        await supabase.storage.from(this.STORAGE_BUCKET).remove(filePaths);
      }
    } catch (error) {
      console.error('删除图片失败:', error);
    }
  }

  /**
   * 删除文章的 HTML/PDF 文件
   */
  private static async deleteArticleFiles(articleId: string): Promise<void> {
    try {
      // 获取文章信息
      const { data: article } = await supabase
        .from('articles')
        .select('html_file_path, pdf_file_path')
        .eq('id', articleId)
        .single();

      if (!article) return;

      const filesToDelete: string[] = [];
      if (article.html_file_path) filesToDelete.push(article.html_file_path);
      if (article.pdf_file_path) filesToDelete.push(article.pdf_file_path);

      if (filesToDelete.length > 0) {
        await supabase.storage.from(this.FILES_BUCKET).remove(filesToDelete);
      }

      // 清空文件字段
      await supabase
        .from('articles')
        .update({
          html_file_path: null,
          html_file_url: null,
          pdf_file_path: null,
          pdf_file_url: null,
        })
        .eq('id', articleId);
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  }

  /**
   * 保存 HTML 或 PDF 文件到 Storage
   */
  private static async saveArticleFile(
    articleId: string,
    fileBlob: Blob,
    fileType: 'html' | 'pdf'
  ): Promise<void> {
    try {
      const fileExt = fileType === 'html' ? 'html' : 'pdf';
      const fileName = `${articleId}/${Date.now()}.${fileExt}`;
      const contentType = fileType === 'html' ? 'text/html' : 'application/pdf';

      // 上传到 Storage
      const { error: uploadError } = await supabase.storage
        .from(this.FILES_BUCKET)
        .upload(fileName, fileBlob, {
          contentType,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error(`上传 ${fileType.toUpperCase()} 文件失败:`, uploadError);
        return;
      }

      // 获取公开 URL
      const { data: urlData } = supabase.storage.from(this.FILES_BUCKET).getPublicUrl(fileName);

      // 更新文章记录
      const updateData =
        fileType === 'html'
          ? { html_file_path: fileName, html_file_url: urlData.publicUrl }
          : { pdf_file_path: fileName, pdf_file_url: urlData.publicUrl };

      await supabase.from('articles').update(updateData).eq('id', articleId);
    } catch (error) {
      console.error(`保存 ${fileType.toUpperCase()} 文件时发生错误:`, error);
    }
  }

  /**
   * 保存文章图片到 Supabase Storage
   * 返回 uniqueId 到 storageUrl 的映射
   * 不再保存到 article_images 表，直接存储到 storage 并在 content 中引用
   */
  private static async saveArticleImages(
    articleId: string,
    images: ArticleImage[]
  ): Promise<{ [uniqueId: string]: string }> {
    const urlMapping: { [uniqueId: string]: string } = {};

    for (let i = 0; i < images.length; i++) {
      const image = images[i] as any;
      try {
        let blob: Blob;

        // 如果是 base64 图片/视频/音频，使用已转换的 blob
        if (image.blob) {
          blob = image.blob;
        }
        // 如果是外链图片，下载它
        else {
          const response = await fetch(image.original_url);
          if (!response.ok) {
            console.warn(`无法下载资源: ${image.original_url}`);
            continue;
          }
          blob = await response.blob();
        }

        const fileExt = image.fileExt || this.getFileExtension(image.original_url) || 'jpg';
        const fileName = `${articleId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 上传到 Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .upload(fileName, blob, {
            contentType: blob.type || 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error(`上传资源失败: ${image.original_url}`, uploadError);
          continue;
        }

        // 获取公开 URL
        const { data: urlData } = supabase.storage.from(this.STORAGE_BUCKET).getPublicUrl(fileName);

        // 如果有 uniqueId，添加到映射中
        if (image.uniqueId) {
          urlMapping[image.uniqueId] = urlData.publicUrl;
        }

        // 不再保存到 article_images 表，图片URL直接在content中引用
      } catch (error) {
        console.error(`处理资源时发生错误: ${image.original_url}`, error);
      }
    }

    return urlMapping;
  }

  /**
   * 从 URL 中获取文件扩展名
   */
  private static getFileExtension(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-z0-9]+)$/i);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * 获取稍后阅读列表(分页) - 不包含完整内容
   */
  static async getArticles(params: PaginationParams): Promise<PaginatedArticles> {
    const { page = 1, pageSize = 10 } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      // 获取总数
      const { count } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      // 获取分页数据 - 只查询列表所需的字段，不包含 content 和 content_text
      // 按照 updated_at 修改时间倒序排列
      const { data: articles, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          url,
          author,
          published_date,
          length,
          language,
          summary,
          ai_summary,
          cover_image,
          html_file_url,
          pdf_file_url,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      return {
        articles: articles || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error('获取文章列表失败:', error);
      return {
        articles: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * 获取单篇文章详情
   */
  static async getArticleById(id: string): Promise<Article | null> {
    try {
      // 获取文章基本信息（图片URL已经在content中）
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (articleError || !article) {
        console.error('获取文章失败:', articleError);
        return null;
      }

      return article;
    } catch (error) {
      console.error('获取文章详情时发生错误:', error);
      return null;
    }
  }

  /**
   * 删除文章
   */
  static async deleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 删除 Storage 中该文章目录下的所有文件（图片/视频/音频）
      await this.deleteArticleImages(id);

      // 2. 删除 Storage 中的 HTML/PDF 文件
      await this.deleteArticleFiles(id);

      // 3. 删除文章记录
      const { error } = await supabase.from('articles').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('删除文章时发生错误:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}
