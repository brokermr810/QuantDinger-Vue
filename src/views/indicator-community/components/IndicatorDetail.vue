<template>
  <a-modal
    :visible="visible"
    :title="null"
    :footer="null"
    :width="720"
    :body-style="{ padding: 0 }"
    @cancel="$emit('close')"
    class="indicator-detail-modal"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container">
        <!-- 头部区域 -->
        <div class="detail-header" :style="headerStyle">
          <div class="header-cover" v-if="detail.preview_image">
            <img :src="detail.preview_image" :alt="detail.name" @error="imageError = true" />
          </div>
          <div class="header-cover default-cover" v-else>
            <span class="cover-initials">{{ indicatorInitials }}</span>
          </div>
          <div class="header-info">
            <h2 class="indicator-name">{{ detail.name }}</h2>
            <div class="indicator-meta">
              <div class="author-info">
                <a-avatar :src="detail.author.avatar" :size="32" />
                <span class="author-name">{{ detail.author.nickname || detail.author.username }}</span>
              </div>
              <div class="publish-time">
                {{ $t('community.publishedAt') }}: {{ formatDate(detail.created_at) }}
              </div>
            </div>
            <div class="indicator-stats">
              <a-statistic :title="$t('community.downloads')" :value="detail.purchase_count || 0">
                <template #prefix>
                  <a-icon type="download" />
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.rating')">
                <template #formatter>
                  <a-rate :value="detail.avg_rating" disabled allow-half :style="{ fontSize: '14px' }" />
                  <span class="rating-text">({{ detail.rating_count || 0 }})</span>
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.views')" :value="detail.view_count || 0">
                <template #prefix>
                  <a-icon type="eye" />
                </template>
              </a-statistic>
            </div>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="detail-body">
          <!-- 描述 -->
          <div class="section">
            <h3>{{ $t('community.description') }}</h3>
            <p class="description">{{ detail.description || $t('community.noDescription') }}</p>
          </div>

          <!-- 实盘表现 -->
          <div class="section" v-if="performance">
            <h3>{{ $t('community.performance') }}</h3>
            <div class="performance-grid">
              <div class="perf-item">
                <div class="perf-label">{{ $t('community.strategyCount') }}</div>
                <div class="perf-value">{{ performance.strategy_count }}</div>
              </div>
              <div class="perf-item">
                <div class="perf-label">{{ $t('community.tradeCount') }}</div>
                <div class="perf-value">{{ performance.trade_count }}</div>
              </div>
              <div class="perf-item">
                <div class="perf-label">{{ $t('community.winRate') }}</div>
                <div class="perf-value" :class="performance.win_rate >= 50 ? 'positive' : 'negative'">
                  {{ performance.win_rate }}%
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">{{ $t('community.totalProfit') }}</div>
                <div class="perf-value" :class="performance.total_profit >= 0 ? 'positive' : 'negative'">
                  {{ performance.total_profit >= 0 ? '+' : '' }}{{ performance.total_profit }}
                </div>
              </div>
            </div>
          </div>

          <!-- 评论区域 -->
          <div class="section">
            <h3>{{ $t('community.reviews') }} ({{ comments.total || 0 }})</h3>
            <comment-list
              :comments="comments.items"
              :loading="commentsLoading"
              :can-comment="detail.is_purchased && !detail.is_own && !myComment"
              :current-user-id="currentUserId"
              :my-comment="myComment"
              :total="comments.total"
              @add-comment="handleAddComment"
              @update-comment="handleUpdateComment"
              @load-more="loadMoreComments"
            />
          </div>
        </div>

        <!-- 底部操作区域 -->
        <div class="detail-footer">
          <div class="price-info">
            <a-tag v-if="detail.vip_free" color="gold" style="margin-right: 8px;">
              {{ $t('community.vipFree') }}
            </a-tag>
            <span v-if="detail.pricing_type === 'free' || detail.price <= 0" class="free-badge">
              {{ $t('community.free') }}
            </span>
            <span v-else class="price-badge">
              {{ detail.price }} {{ $t('community.credits') }}
            </span>
          </div>
          <div class="action-buttons">
            <a-button v-if="detail.is_own" disabled>
              {{ $t('community.myIndicator') }}
            </a-button>
            <a-button v-else-if="detail.is_purchased" type="primary" @click="goToUse">
              <a-icon type="code" /> {{ $t('community.useNow') }}
            </a-button>
            <a-button
              v-else
              type="primary"
              :loading="purchasing"
              @click="handlePurchase"
            >
              <a-icon type="shopping-cart" />
              {{ detail.pricing_type === 'free' || detail.price <= 0 ? $t('community.getFree') : $t('community.buyNow') }}
            </a-button>
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import CommentList from './CommentList.vue'
import request from '@/utils/request'

export default {
  name: 'IndicatorDetail',
  components: {
    CommentList
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    indicatorId: {
      type: Number,
      default: null
    },
    currentUserId: {
      type: [Number, String],
      default: null
    }
  },
  data () {
    return {
      loading: false,
      purchasing: false,
      commentsLoading: false,
      detail: null,
      performance: null,
      comments: {
        items: [],
        total: 0,
        page: 1
      },
      myComment: null,
      imageError: false
    }
  },
  computed: {
    // 头部背景样式
    headerStyle () {
      if (!this.detail) return {}
      // 根据指标 ID 生成渐变色
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
      ]
      const index = (this.detail.id || 0) % gradients.length
      return { background: gradients[index] }
    },
    // 指标名称首字母
    indicatorInitials () {
      if (!this.detail) return ''
      const name = this.detail.name || 'I'
      if (/[\u4e00-\u9fa5]/.test(name)) {
        return name.slice(0, 2)
      }
      const words = name.split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
  },
  watch: {
    visible (val) {
      if (val && this.indicatorId) {
        this.loadDetail()
        this.loadPerformance()
        this.loadComments(1)
        this.loadMyComment()
      } else {
        this.resetData()
      }
    }
  },
  methods: {
    resetData () {
      this.detail = null
      this.performance = null
      this.comments = { items: [], total: 0, page: 1 }
      this.myComment = null
    },

    async loadDetail () {
      this.loading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}`,
          method: 'get'
        })
        if (res.code === 1) {
          this.detail = res.data
        } else {
          this.$message.error(res.msg || this.$t('community.loadFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('community.loadFailed'))
      } finally {
        this.loading = false
      }
    },

    async loadPerformance () {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/performance`,
          method: 'get'
        })
        if (res.code === 1) {
          this.performance = res.data
        }
      } catch (e) {
        console.error('Load performance failed:', e)
      }
    },

    async loadComments (page = 1) {
      this.commentsLoading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'get',
          params: { page, page_size: 10 }
        })
        if (res.code === 1) {
          if (page === 1) {
            this.comments.items = res.data.items
          } else {
            this.comments.items = [...this.comments.items, ...res.data.items]
          }
          this.comments.total = res.data.total
          this.comments.page = page
        }
      } catch (e) {
        console.error('Load comments failed:', e)
      } finally {
        this.commentsLoading = false
      }
    },

    loadMoreComments () {
      if (this.comments.items.length < this.comments.total) {
        this.loadComments(this.comments.page + 1)
      }
    },

    async loadMyComment () {
      if (!this.currentUserId) return
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/my-comment`,
          method: 'get'
        })
        if (res.code === 1) {
          this.myComment = res.data
        }
      } catch (e) {
        console.error('Load my comment failed:', e)
      }
    },

    async handleAddComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'post',
          data
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          // 刷新详情以更新评分
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentFailed'))
      }
    },

    async handleUpdateComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments/${data.comment_id}`,
          method: 'put',
          data: {
            rating: data.rating,
            content: data.content
          }
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentUpdateSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          // 刷新详情以更新评分
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentUpdateFailed'))
      }
    },

    async handlePurchase () {
      this.purchasing = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/purchase`,
          method: 'post'
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.purchaseSuccess'))
          this.loadDetail()
          this.$emit('purchased')
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.purchaseFailed'))
      } finally {
        this.purchasing = false
      }
    },

    goToUse () {
      this.$emit('close')
      this.$router.push('/indicator-analysis')
    },

    formatDate (dateStr) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString()
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-detail-modal {
  .detail-container {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .detail-header {
    display: flex;
    gap: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    .header-cover {
      width: 180px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.default-cover {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.3);

        .cover-initials {
          font-size: 42px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          letter-spacing: 2px;
        }
      }
    }

    .header-info {
      flex: 1;

      .indicator-name {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: #fff;
      }

      .indicator-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;

        .author-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .author-name {
            font-size: 14px;
          }
        }

        .publish-time {
          font-size: 12px;
          opacity: 0.8;
        }
      }

      .indicator-stats {
        display: flex;
        gap: 24px;

        /deep/ .ant-statistic {
          .ant-statistic-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }

          .ant-statistic-content {
            color: #fff;
            font-size: 16px;
          }
        }

        .rating-text {
          font-size: 12px;
          margin-left: 4px;
          opacity: 0.8;
        }
      }
    }
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;

    .section {
      margin-bottom: 24px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;
      }

      .description {
        font-size: 14px;
        line-height: 1.8;
        color: rgba(0, 0, 0, 0.65);
        white-space: pre-wrap;
      }
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;

      .perf-item {
        text-align: center;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 8px;

        .perf-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
          margin-bottom: 4px;
        }

        .perf-value {
          font-size: 18px;
          font-weight: 600;

          &.positive {
            color: #52c41a;
          }

          &.negative {
            color: #f5222d;
          }
        }
      }
    }
  }

  .detail-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;

    .price-info {
      .free-badge {
        font-size: 20px;
        font-weight: 600;
        color: #52c41a;
      }

      .price-badge {
        font-size: 20px;
        font-weight: 600;
        color: #f5222d;
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
    }
  }
}

// 暗色主题
body.dark,
.dark,
[data-theme='dark'] {
  .indicator-detail-modal {
    .ant-modal-content {
      background: #1f1f1f;
      color: rgba(255, 255, 255, 0.85);
    }

    .ant-modal-close {
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        color: rgba(255, 255, 255, 0.92);
      }
    }

    .detail-body {
      background: #1a1a1a;

      .section h3 {
        color: rgba(255, 255, 255, 0.88);
        border-color: #303030;
      }

      .description {
        color: rgba(255, 255, 255, 0.65);
      }

      .performance-grid .perf-item {
        background: #262626;

        .perf-label {
          color: rgba(255, 255, 255, 0.45);
        }

        .perf-value {
          color: rgba(255, 255, 255, 0.88);
        }
      }
    }

    .detail-footer {
      background: #1f1f1f;
      border-color: #303030;
    }

    .action-buttons {
      .ant-btn:not(.ant-btn-primary) {
        background: #262626;
        border-color: #434343;
        color: rgba(255, 255, 255, 0.72);
      }
    }

    /deep/ .ant-statistic {
      .ant-statistic-content {
        color: rgba(255, 255, 255, 0.88);
      }
    }

    .rating-text {
      color: rgba(255, 255, 255, 0.72);
    }

    .publish-time {
      color: rgba(255, 255, 255, 0.72);
    }

    .author-name {
      color: rgba(255, 255, 255, 0.92);
    }
  }
}

</style>
