<template>
  <div class="popup-blocklist">
    <!-- Header -->
    <div class="blocklist-header">
      <button @click="$emit('navigate', 'home')" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>屏蔽管理</h2>
      <button v-if="blocklist.length > 0" @click="clearAll" class="clear-btn" title="清空全部">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
      <div v-else class="header-spacer"></div>
    </div>

    <!-- Content -->
    <div class="blocklist-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="blocklist.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
        <h3>暂无屏蔽项</h3>
        <p>在主页可以屏蔽页面或网站</p>
      </div>

      <!-- Blocklist -->
      <div v-else class="blocklist-items">
        <!-- Statistics -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">总计</span>
            <span class="stat-value">{{ blocklist.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">页面</span>
            <span class="stat-value">{{ pageCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">网站</span>
            <span class="stat-value">{{ domainCount }}</span>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'" class="filter-tab">
            全部 ({{ blocklist.length }})
          </button>
          <button :class="{ active: filter === 'page' }" @click="filter = 'page'" class="filter-tab">
            页面 ({{ pageCount }})
          </button>
          <button :class="{ active: filter === 'domain' }" @click="filter = 'domain'" class="filter-tab">
            网站 ({{ domainCount }})
          </button>
        </div>

        <!-- List -->
        <div class="item-list">
          <div v-for="item in filteredBlocklist" :key="item.id" class="blocklist-item">
            <div class="item-icon">
              <svg v-if="item.type === 'page'" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M2 12h20"></path>
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z">
                </path>
              </svg>
            </div>
            <div class="item-info">
              <h3 class="item-title">{{ item.title || item.url }}</h3>
              <p class="item-url">{{ item.url }}</p>
              <span class="item-time">{{ formatTime(item.addedAt) }}</span>
            </div>
            <button @click="removeItem(item)" class="remove-btn" title="解除屏蔽">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { BlocklistService, type BlocklistItem } from '../../services/blocklistService';

const emit = defineEmits(['navigate']);

const loading = ref(false);
const blocklist = ref<BlocklistItem[]>([]);
const filter = ref<'all' | 'page' | 'domain'>('all');

// 统计
const pageCount = computed(() => blocklist.value.filter((item) => item.type === 'page').length);
const domainCount = computed(() => blocklist.value.filter((item) => item.type === 'domain').length);

// 过滤后的列表
const filteredBlocklist = computed(() => {
  if (filter.value === 'all') return blocklist.value;
  return blocklist.value.filter((item) => item.type === filter.value);
});

// 加载屏蔽列表
async function loadBlocklist() {
  loading.value = true;
  try {
    blocklist.value = await BlocklistService.getBlocklist();
  } catch (error) {
    console.error('加载屏蔽列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 删除单个屏蔽项
async function removeItem(item: BlocklistItem) {
  if (!confirm(`确定要解除屏蔽「${item.title || item.url}」吗？`)) {
    return;
  }

  try {
    await BlocklistService.removeBlocklistItem(item.id);
    blocklist.value = blocklist.value.filter((i) => i.id !== item.id);
  } catch (error) {
    console.error('删除屏蔽项失败:', error);
    alert('删除失败，请重试');
  }
}

// 清空全部
async function clearAll() {
  if (!confirm(`确定要清空全部 ${blocklist.value.length} 个屏蔽项吗？`)) {
    return;
  }

  try {
    await BlocklistService.clearBlocklist();
    blocklist.value = [];
  } catch (error) {
    console.error('清空屏蔽列表失败:', error);
    alert('清空失败，请重试');
  }
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

onMounted(() => {
  loadBlocklist();
});
</script>

<style scoped>
.popup-blocklist {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

/* Header */
.blocklist-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
  background: var(--sd-background-primary);
}

.back-btn,
.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover,
.clear-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

.clear-btn:hover {
  color: #ff4444;
  border-color: #ff4444;
}

.blocklist-header h2 {
  margin: 0;
  flex: 1;
  font-size: 18px;
  font-weight: 600;
}

.header-spacer {
  width: 32px;
}

/* Content */
.blocklist-content {
  flex: 1;
  overflow-y: auto;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--sd-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--sd-text-secondary);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--sd-text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Blocklist Items */
.blocklist-items {
  display: flex;
  flex-direction: column;
}

/* Statistics Bar */
.stats-bar {
  display: flex;
  gap: 20px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
  background: var(--sd-background-secondary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--sd-text-secondary);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--sd-accent-color);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--sd-border-color);
}

.filter-tab {
  padding: 6px 16px;
  font-size: 13px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: var(--sd-hover-background);
}

.filter-tab.active {
  background: var(--sd-accent-color);
  color: white;
  border-color: var(--sd-accent-color);
}

/* Item List */
.item-list {
  display: flex;
  flex-direction: column;
}

.blocklist-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
  transition: all 0.2s;
}

.blocklist-item:hover {
  background: var(--sd-hover-background);
}

.item-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--sd-background-secondary);
  color: var(--sd-accent-color);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--sd-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-url {
  margin: 0;
  font-size: 12px;
  color: var(--sd-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}

.item-time {
  font-size: 11px;
  color: var(--sd-text-secondary);
  opacity: 0.7;
}

.remove-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #fee;
  border-color: #ff4444;
  color: #ff4444;
}

/* Scrollbar */
.blocklist-content::-webkit-scrollbar {
  width: 6px;
}

.blocklist-content::-webkit-scrollbar-track {
  background: var(--sd-background-secondary);
}

.blocklist-content::-webkit-scrollbar-thumb {
  background: var(--sd-border-color);
  border-radius: 3px;
}

.blocklist-content::-webkit-scrollbar-thumb:hover {
  background: var(--sd-text-secondary);
}
</style>
