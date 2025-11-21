// 文章数据类型定义
export interface Article {
  id?: string;
  title: string;
  url: string;
  author?: string;
  published_date?: string;
  length?: number;
  language?: string;
  summary?: string;
  ai_summary?: string; // AI 生成的摘要
  content: string;
  content_text?: string;
  cover_image?: string; // 文章首图 URL
  images?: ArticleImage[];
  html_file_path?: string; // HTML 文件在 Storage 中的路径
  html_file_url?: string; // HTML 文件的公开 URL
  pdf_file_path?: string; // PDF 文件在 Storage 中的路径
  pdf_file_url?: string; // PDF 文件的公开 URL
  created_at?: string;
  updated_at?: string;
}

// 文章图片类型定义
export interface ArticleImage {
  id?: string;
  article_id?: string;
  original_url: string;
  storage_path?: string;
  storage_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  created_at?: string;
}

// 分页查询参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页查询结果
export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
