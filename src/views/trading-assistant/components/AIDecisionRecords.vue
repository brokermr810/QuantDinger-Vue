<template>
  <div class="ai-decision-records">
    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="decisions"
        :pagination="paginationConfig"
        :scroll="{ x: 'max-content' }"
        row-key="id"
        size="small"
      >
        <template slot="reasoning" slot-scope="text">
          <a-tooltip :title="text">
            <div class="reasoning-text">{{ text }}</div>
          </a-tooltip>
        </template>
        <template slot="decisions" slot-scope="decisionList">
          <a-tag
            v-for="(d, index) in decisionList"
            :key="index"
            :color="getActionColor(d.action)"
            style="margin-right: 4px;"
          >
            {{ getActionText(d.action) }}: {{ d.symbol }}
          </a-tag>
        </template>
        <template slot="confidence" slot-scope="confidence">
          <a-progress
            :percent="Math.round(confidence * 100)"
            :status="confidence > 0.7 ? 'success' : confidence > 0.4 ? 'active' : 'exception'"
            :show-info="true"
            size="small"
          />
        </template>
      </a-table>
    </a-spin>
  </div>
</template>

<script>
import { getAIDecisions } from '@/api/ai-trading'

export default {
  name: 'AIDecisionRecords',
  props: {
    strategyId: {
      type: Number,
      required: true
    }
  },
  data () {
    return {
      loading: false,
      decisions: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      }
    }
  },
  computed: {
    paginationConfig () {
      return {
        ...this.pagination,
        showTotal: (total) => this.$t('ai-trading-assistant.table.totalRecords', { total }),
        onChange: this.handlePageChange,
        onShowSizeChange: this.handlePageSizeChange
      }
    },
    columns () {
      return [
        {
          title: this.$t('ai-trading-assistant.table.time'),
          dataIndex: 'created_at',
          key: 'created_at',
          width: 180,
          customRender: (text) => {
            return new Date(text * 1000).toLocaleString('zh-CN')
          }
        },
        {
          title: this.$t('ai-trading-assistant.table.reasoning'),
          dataIndex: 'decision.reasoning',
          key: 'reasoning',
          width: 300,
          scopedSlots: { customRender: 'reasoning' }
        },
        {
          title: this.$t('ai-trading-assistant.table.decisions'),
          dataIndex: 'decision.decisions',
          key: 'decisions',
          width: 200,
          scopedSlots: { customRender: 'decisions' }
        },
        {
          title: this.$t('ai-trading-assistant.table.riskAssessment'),
          dataIndex: 'decision.risk_assessment',
          key: 'risk_assessment',
          width: 100
        },
        {
          title: this.$t('ai-trading-assistant.table.confidence'),
          dataIndex: 'decision.confidence',
          key: 'confidence',
          width: 150,
          scopedSlots: { customRender: 'confidence' }
        }
      ]
    }
  },
  watch: {
    strategyId: {
      immediate: true,
      handler () {
        this.loadDecisions()
      }
    }
  },
  methods: {
    async loadDecisions () {
      if (!this.strategyId) return

      this.loading = true
      try {
        const res = await getAIDecisions(this.strategyId, {
          page: this.pagination.current,
          limit: this.pagination.pageSize
        })
        if (res.code === 1) {
          // 处理返回的数据格式
          const data = res.data
          let decisions = []
          let total = 0

          // 兼容新旧格式
          if (data && typeof data === 'object') {
            if (Array.isArray(data)) {
              // 旧格式：直接是数组
              decisions = data
              total = data.length
            } else if (data.decisions) {
              // 新格式：包含 decisions 和 total
              decisions = data.decisions || []
              total = data.total || 0
            }
          }

          this.decisions = decisions.map(item => ({
            ...item,
            decision: item.decision || {}
          }))
          this.pagination.total = total
        }
      } catch (error) {
        this.$message.error(this.$t('ai-trading-assistant.messages.loadDecisionsFailed'))
      } finally {
        this.loading = false
      }
    },
    getActionColor (action) {
      const colorMap = {
        buy: 'green',
        sell: 'red',
        short: 'orange',
        close_short: 'blue',
        hold: 'cyan'
      }
      return colorMap[action] || 'default'
    },
    getActionText (action) {
      const actionMap = {
        buy: this.$t('ai-trading-assistant.table.buy'),
        sell: this.$t('ai-trading-assistant.table.sell'),
        short: this.$t('ai-trading-assistant.table.short'),
        close_short: this.$t('ai-trading-assistant.table.closeShort'),
        hold: this.$t('ai-trading-assistant.table.hold')
      }
      return actionMap[action] || action
    },
    handlePageChange (page, pageSize) {
      this.pagination.current = page
      this.pagination.pageSize = pageSize
      this.loadDecisions()
    },
    handlePageSizeChange (current, size) {
      this.pagination.current = 1
      this.pagination.pageSize = size
      this.loadDecisions()
    }
  }
}
</script>

<style lang="less" scoped>
.ai-decision-records {
  width: 100%;
  min-height: 300px;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  color: var(--text-color, #1f1f1f);

  .reasoning-text {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-color, #1f1f1f);
  }

  // 确保 hold 标签（cyan）在所有主题下都有足够的对比度
  /deep/ .ant-tag {
    &.ant-tag-cyan {
      background-color: #13c2c2 !important;
      border-color: #13c2c2 !important;
      color: #fff !important;
    }
  }

  // 表格容器横向滚动
  /deep/ .ant-table-wrapper {
    min-width: 100%;
  }

  // 适配主题色
  /deep/ .ant-table {
    background: var(--table-row-bg, #fff);
    color: var(--text-color, #1f1f1f);

    .ant-table-thead > tr > th {
      background: var(--table-header-bg, #fafafa);
      color: var(--text-color, #1f1f1f);
      border-bottom-color: var(--table-border-color, #e8e8e8);

      .ant-table-column-title {
        color: var(--text-color, #1f1f1f);
      }
    }

    .ant-table-tbody > tr:hover > td {
      background-color: var(--hover-bg-color, #fafafa);
    }

    .ant-table-tbody > tr > td {
      background: var(--table-row-bg, #fff);
      color: var(--text-color, #1f1f1f);
      border-bottom-color: var(--table-border-color, #e8e8e8);
    }

    .ant-table-body {
      &::-webkit-scrollbar {
        height: 6px;
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: var(--table-row-bg, #fff);
      }

      &::-webkit-scrollbar-thumb {
        background: #bfbfbf;
        border-radius: 4px;

        &:hover {
          background: #a6a6a6;
        }
      }
    }
  }

  // 进度条使用主题色
  /deep/ .ant-progress {
    .ant-progress-bg {
      background-color: var(--primary-color, #1890ff);
    }

    &.ant-progress-status-success .ant-progress-bg {
      background-color: #52c41a;
    }

    &.ant-progress-status-exception .ant-progress-bg {
      background-color: #ff4d4f;
    }
  }

  // 自定义滚动条样式
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;

    &:hover {
      background: #555;
    }
  }

  // 分页器主题适配
  /deep/ .ant-pagination {
    color: var(--text-color, #1f1f1f);

    .ant-pagination-total-text {
      color: var(--text-color-secondary, #8c8c8c);
    }

    .ant-pagination-item {
      background: var(--table-row-bg, #fff);
      border-color: var(--table-border-color, #e8e8e8);

      a {
        color: var(--text-color, #1f1f1f);
      }

      &:hover {
        border-color: var(--primary-color, #1890ff);

        a {
          color: var(--primary-color, #1890ff);
        }
      }

      &.ant-pagination-item-active {
        background: var(--primary-color, #1890ff);
        border-color: var(--primary-color, #1890ff);

        a {
          color: #fff;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: var(--table-row-bg, #fff);
        border-color: var(--table-border-color, #e8e8e8);
        color: var(--text-color, #1f1f1f);

        &:hover {
          border-color: var(--primary-color, #1890ff);
          color: var(--primary-color, #1890ff);
        }
      }
    }

    .ant-pagination-options {
      .ant-select-selector {
        background: var(--table-row-bg, #fff);
        border-color: var(--table-border-color, #e8e8e8);
        color: var(--text-color, #1f1f1f);
      }
    }
  }
}
</style>

<style lang="less">
// 全局样式：暗色主题下的标签优化
.trading-assistant.theme-dark {
  .ai-decision-records {
    /deep/ .ant-table {
      background: var(--table-row-bg, #1c1c1c);
      color: var(--text-color, #d1d4dc);

      .ant-table-thead > tr > th {
        background: var(--table-header-bg, #252932) !important;
        color: var(--text-color, #d1d4dc) !important;
        border-bottom-color: var(--table-border-color, #2a2e39);

        .ant-table-column-title {
          color: var(--text-color, #d1d4dc) !important;
        }
      }

      .ant-table-tbody > tr > td {
        background: var(--table-row-bg, #1c1c1c);
        color: var(--text-color, #d1d4dc);
        border-bottom-color: var(--table-border-color, #2a2e39);
      }

      .ant-table-tbody > tr:hover > td {
        background-color: var(--table-hover-bg, #252932);
      }

      .ant-table-body {
        &::-webkit-scrollbar-track {
          background: var(--table-row-bg, #1c1c1c);
        }

        &::-webkit-scrollbar-thumb {
          background: #555;

          &:hover {
            background: #777;
          }
        }
      }
    }

    .reasoning-text {
      color: var(--text-color, #d1d4dc);
    }

    /deep/ .ant-tag {
      // hold 标签使用青色，确保在暗色背景下可见
      &.ant-tag-cyan {
        background-color: #13c2c2 !important;
        border-color: #13c2c2 !important;
        color: #fff !important;
      }

      // 其他标签在暗色主题下的优化
      &.ant-tag-green {
        background-color: #52c41a !important;
        border-color: #52c41a !important;
        color: #fff !important;
      }

      &.ant-tag-red {
        background-color: #ff4d4f !important;
        border-color: #ff4d4f !important;
        color: #fff !important;
      }

      &.ant-tag-orange {
        background-color: #fa8c16 !important;
        border-color: #fa8c16 !important;
        color: #fff !important;
      }

      &.ant-tag-blue {
        background-color: var(--primary-color, #1890ff) !important;
        border-color: var(--primary-color, #1890ff) !important;
        color: #fff !important;
      }

      // default 标签在暗色主题下的优化
      &.ant-tag-default {
        background-color: #434343 !important;
        border-color: #434343 !important;
        color: #fff !important;
      }
    }

    // 进度条在暗色主题下使用主题色
    /deep/ .ant-progress {
      .ant-progress-bg {
        background-color: var(--primary-color, #1890ff);
      }

      &.ant-progress-status-success .ant-progress-bg {
        background-color: #52c41a;
      }

      &.ant-progress-status-exception .ant-progress-bg {
        background-color: #ff4d4f;
      }
    }

    // 暗色主题下的滚动条样式
    &::-webkit-scrollbar-track {
      background: #2a2e39;
    }

    &::-webkit-scrollbar-thumb {
      background: #555;

      &:hover {
        background: #777;
      }
    }

    // 暗色主题下的分页器
    /deep/ .ant-pagination {
      color: var(--text-color, #d1d4dc);

      .ant-pagination-total-text {
        color: var(--text-color-secondary, #868993);
      }

      .ant-pagination-item {
        background: var(--table-row-bg, #1c1c1c);
        border-color: var(--table-border-color, #2a2e39);

        a {
          color: var(--text-color, #d1d4dc);
        }

        &:hover {
          border-color: var(--primary-color, #1890ff);

          a {
            color: var(--primary-color, #1890ff);
          }
        }

        &.ant-pagination-item-active {
          background: var(--primary-color, #1890ff);
          border-color: var(--primary-color, #1890ff);

          a {
            color: #fff;
          }
        }
      }

      .ant-pagination-prev,
      .ant-pagination-next {
        .ant-pagination-item-link {
          background: var(--table-row-bg, #1c1c1c);
          border-color: var(--table-border-color, #2a2e39);
          color: var(--text-color, #d1d4dc);

          &:hover {
            border-color: var(--primary-color, #1890ff);
            color: var(--primary-color, #1890ff);
          }
        }
      }

      .ant-pagination-options {
        .ant-select-selector {
          background: var(--table-row-bg, #1c1c1c);
          border-color: var(--table-border-color, #2a2e39);
          color: var(--text-color, #d1d4dc);
        }
      }
    }
  }
}
</style>
