<template>
  <div class="position-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div v-if="positions.length === 0 && !loading" class="empty-state strategy-tab-empty">
      <a-empty :description="$t('trading-assistant.table.noPositions')" />
    </div>
    <a-table
      v-else
      :columns="columns"
      :data-source="positions"
      :loading="loading"
      :pagination="false"
      size="small"
      rowKey="id"
      :scroll="{ x: 800 }"
    >
      <template slot="symbol" slot-scope="text, record">
        <strong>{{ record.symbol || text }}</strong>
      </template>
      <template slot="side" slot-scope="text, record">
        <a-tag :color="(record.side || text) === 'long' ? 'green' : 'red'">
          {{ (record.side || text) === 'long' ? $t('trading-assistant.table.long') : $t('trading-assistant.table.short') }}
        </a-tag>
      </template>
      <template slot="entryPrice" slot-scope="text, record">
        <span v-if="hasValidPrice(record.entry_price || text)">
          ${{ parseFloat(record.entry_price || text).toFixed(4) }}
        </span>
        <span v-else>--</span>
      </template>
      <template slot="currentPrice" slot-scope="text, record">
        ${{ parseFloat(record.current_price || text || 0).toFixed(4) }}
      </template>
      <template slot="size" slot-scope="text, record">
        {{ parseFloat(record.size || text || 0).toFixed(4) }}
      </template>
      <template slot="unrealizedPnl" slot-scope="text, record">
        <span :class="{ 'profit': parseFloat(record.unrealized_pnl || text || 0) > 0, 'loss': parseFloat(record.unrealized_pnl || text || 0) < 0 }">
          ${{ parseFloat(record.unrealized_pnl || text || 0).toFixed(2) }}
        </span>
      </template>
      <template slot="pnlPercent" slot-scope="text, record">
        <span :class="{ 'profit': parseFloat(record.pnl_percent || text || 0) > 0, 'loss': parseFloat(record.pnl_percent || text || 0) < 0 }">
          {{ parseFloat(record.pnl_percent || text || 0).toFixed(2) }}%
        </span>
      </template>
    </a-table>
  </div>
</template>

<script>
import { getStrategyPositions } from '@/api/strategy'

export default {
  name: 'PositionRecords',
  props: {
    strategyId: {
      type: Number,
      required: true
    },
    marketType: {
      type: String,
      default: 'swap'
    },
    leverage: {
      type: [Number, String],
      default: 1
    },
    loading: {
      type: Boolean,
      default: false
    },
    isDark: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      positions: []
    }
  },
  computed: {
    columns () {
      return [
        {
          title: this.$t('trading-assistant.table.symbol'),
          dataIndex: 'symbol',
          key: 'symbol',
          width: 120,
          scopedSlots: { customRender: 'symbol' }
        },
        {
          title: this.$t('trading-assistant.table.side'),
          dataIndex: 'side',
          key: 'side',
          width: 80,
          scopedSlots: { customRender: 'side' }
        },
        {
          title: this.$t('trading-assistant.table.size'),
          dataIndex: 'size',
          key: 'size',
          width: 120,
          scopedSlots: { customRender: 'size' }
        },
        {
          title: this.$t('trading-assistant.table.entryPrice'),
          dataIndex: 'entry_price',
          key: 'entry_price',
          width: 120,
          scopedSlots: { customRender: 'entryPrice' }
        },
        {
          title: this.$t('trading-assistant.table.currentPrice'),
          dataIndex: 'current_price',
          key: 'current_price',
          width: 120,
          scopedSlots: { customRender: 'currentPrice' }
        },
        {
          title: this.$t('trading-assistant.table.unrealizedPnl'),
          dataIndex: 'unrealized_pnl',
          key: 'unrealized_pnl',
          width: 120,
          scopedSlots: { customRender: 'unrealizedPnl' }
        },
        {
          title: this.$t('trading-assistant.table.pnlPercent'),
          dataIndex: 'pnl_percent',
          key: 'pnl_percent',
          width: 100,
          scopedSlots: { customRender: 'pnlPercent' }
        }
      ]
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) {
          this.loadPositions()
          // 每5秒刷新一次持仓
          this.startPolling()
        } else {
          this.stopPolling()
        }
      },
      immediate: true
    }
  },
  beforeDestroy () {
    this.stopPolling()
  },
  methods: {
    async loadPositions () {
      if (!this.strategyId) return

      try {
        const res = await getStrategyPositions(this.strategyId)
        if (res.code === 1) {
          // 确保数据格式正确，处理可能的字段名不一致
          const rawPositions = res.data.positions || []

          this.positions = rawPositions.map((position, index) => {
            const mt = String(this.marketType || 'swap').toLowerCase()
            let lev = parseFloat(this.leverage)
            if (!isFinite(lev) || lev <= 0) lev = 1
            if (mt === 'spot') lev = 1

            // 处理 entry_price：不要回退到 current_price，避免误导显示开仓价=现价
            const entryPrice = parseFloat(position.entry_price || position.entryPrice || 0)
            const size = parseFloat(position.size || '0') || 0
            const pnl = parseFloat(position.unrealized_pnl || position.unrealizedPnl || '0') || 0
            let pnlPercent = parseFloat(position.pnl_percent || position.pnlPercent || '0') || 0

            // Prefer margin-based pnl% (pnl / (notional / leverage)).
            // If backend already returns pnl_percent, we still recompute from pnl/entry/size to keep it consistent.
            if (entryPrice > 0 && size > 0) {
              pnlPercent = (pnl / (entryPrice * size)) * 100 * lev
            } else if (mt !== 'spot') {
              pnlPercent = pnlPercent * lev
            }

            const mapped = {
              id: position.id || index,
              symbol: position.symbol || '',
              side: position.side || 'long',
              size: size > 0 ? size.toString() : '0',
              entry_price: entryPrice > 0 ? entryPrice.toString() : '0',
              current_price: position.current_price || position.currentPrice || '0',
              unrealized_pnl: position.unrealized_pnl || position.unrealizedPnl || '0',
              pnl_percent: pnlPercent,
              updated_at: position.updated_at || position.updatedAt || ''
            }
            return mapped
          })
        } else {
          // 不显示错误，可能策略还没有持仓
          this.positions = []
        }
      } catch (error) {
        this.positions = []
      }
    },
    hasValidPrice (price) {
      const value = parseFloat(price)
      return Number.isFinite(value) && value > 0
    },
    startPolling () {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        this.loadPositions()
      }, 5000)
    },
    stopPolling () {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
// 颜色变量
@primary-color: #1890ff;
@success-color: #0ecb81;
@danger-color: #f6465d;

.position-records {
  width: 100%;
  min-height: 300px;
  padding: 0;

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    padding: 40px 16px;
    border-radius: 8px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
  }

  &.theme-dark .empty-state {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  ::v-deep .ant-table {
    font-size: 13px;
    color: #333;
  }

  // 自定义细滚动条
  ::v-deep .ant-table-body {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  // 表格容器的滚动条样式
  ::v-deep .ant-table-container {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  // 所有可能的表格滚动容器的滚动条样式
  ::v-deep .ant-table-content,
  ::v-deep .ant-table-wrapper {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  ::v-deep .ant-table-thead > tr > th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 16px;
    font-size: 13px;
  }

  ::v-deep .ant-table-tbody > tr > td {
    padding: 12px 16px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.2s ease;

    strong {
      color: #262626;
      font-weight: 600;
    }
  }

  ::v-deep .ant-table-tbody > tr {
    &:hover > td {
      background: #f0f7ff !important;
    }
  }

  // 方向标签美化
  ::v-deep .ant-tag {
    border-radius: 6px;
    padding: 2px 10px;
    font-weight: 600;
    font-size: 11px;
    border: none;

    &[color="green"] {
      background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
      color: @success-color;
      border: 1px solid rgba(14, 203, 129, 0.3);
    }

    &[color="red"] {
      background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
      color: @danger-color;
      border: 1px solid rgba(246, 70, 93, 0.3);
    }
  }

  // 暗黑主题适配
  &.theme-dark,
  .theme-dark & {
    ::v-deep .ant-table {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
    }

    ::v-deep .ant-table-thead > tr > th {
      background: #2a2e39 !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
      font-weight: 600;
    }

    ::v-deep .ant-table-tbody > tr > td {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
    }

    ::v-deep .ant-table-tbody > tr:hover > td {
      background: #2a2e39 !important;
    }

    ::v-deep .ant-table-tbody > tr > td strong {
      color: #d1d4dc !important;
    }
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }

  ::v-deep .ant-empty {
    margin: 40px 0;

    .ant-empty-description {
      color: #8c8c8c;
    }
  }

  &.theme-dark ::v-deep .ant-empty .ant-empty-description {
    color: rgba(255, 255, 255, 0.35);
  }

  .profit {
    color: @success-color;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: linear-gradient(135deg, rgba(14, 203, 129, 0.12) 0%, rgba(14, 203, 129, 0.06) 100%);
    border-radius: 6px;

    &::before {
      content: '▲';
      font-size: 8px;
    }
  }

  .loss {
    color: @danger-color;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: linear-gradient(135deg, rgba(246, 70, 93, 0.12) 0%, rgba(246, 70, 93, 0.06) 100%);
    border-radius: 6px;

    &::before {
      content: '▼';
      font-size: 8px;
    }
  }

  // 移动端适配
  @media (max-width: 768px) {
    min-height: 200px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    // 移动端也使用细滚动条
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 4px;
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }

    .empty-state {
      min-height: 150px;
      padding: 20px 0;
    }

    ::v-deep .ant-table {
      font-size: 12px;
      min-width: 700px; // 确保表格最小宽度，触发横向滚动
    }

    // 移动端也使用细滚动条
    ::v-deep .ant-table-body,
    ::v-deep .ant-table-container,
    ::v-deep .ant-table-wrapper {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      &::-webkit-scrollbar {
        height: 4px;
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 2px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 2px;
        &:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      }
    }

    ::v-deep .ant-table-thead > tr > th {
      padding: 8px 10px;
      font-size: 11px;
      white-space: nowrap;
    }

    ::v-deep .ant-table-tbody > tr > td {
      padding: 8px 10px;
      font-size: 11px;
      white-space: nowrap;
    }

    ::v-deep .ant-empty {
      margin: 20px 0;
    }
  }

  @media (max-width: 480px) {
    ::v-deep .ant-table {
      font-size: 11px;
      min-width: 600px;
    }

    ::v-deep .ant-table-thead > tr > th {
      padding: 6px 8px;
      font-size: 10px;
    }

    ::v-deep .ant-table-tbody > tr > td {
      padding: 6px 8px;
      font-size: 10px;
    }

    .profit,
    .loss {
      font-size: 11px;
    }
  }
}
</style>

<style lang="less">
// 暗黑主题适配 - 使用更高优先级的选择器覆盖 scoped 样式
// 必须使用完整的 scoped 选择器路径来覆盖
.theme-dark .position-records .ant-table-tbody > tr > td,
.theme-dark .position-records[data-v] .ant-table-tbody > tr > td,
body.dark .position-records .ant-table-tbody > tr > td,
body.realdark .position-records .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .position-records .ant-table-thead > tr > th,
.theme-dark .position-records[data-v] .ant-table-thead > tr > th,
body.dark .position-records .ant-table-thead > tr > th,
body.realdark .position-records .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
  font-weight: 600 !important;
}

.theme-dark .position-records .ant-table,
.theme-dark .position-records[data-v] .ant-table,
body.dark .position-records .ant-table,
body.realdark .position-records .ant-table {
  background: #1c1c1c !important;
  color: #d1d4dc !important;
}

.theme-dark .position-records .ant-table-tbody > tr > td *,
.theme-dark .position-records[data-v] .ant-table-tbody > tr > td *,
body.dark .position-records .ant-table-tbody > tr > td *,
body.realdark .position-records .ant-table-tbody > tr > td * {
  color: #d1d4dc !important;
}

.theme-dark .position-records .ant-table-tbody > tr:hover > td,
.theme-dark .position-records[data-v] .ant-table-tbody > tr:hover > td,
body.dark .position-records .ant-table-tbody > tr:hover > td,
body.realdark .position-records .ant-table-tbody > tr:hover > td {
  background: #2a2e39 !important;
}

// 确保表头文字可见
.theme-dark .position-records .ant-table-thead > tr > th,
.theme-dark .position-records[data-v] .ant-table-thead > tr > th,
body.dark .position-records .ant-table-thead > tr > th,
body.realdark .position-records .ant-table-thead > tr > th {
  .ant-table-column-title {
    color: #d1d4dc !important;
  }
}

// 通用选择器作为后备
.theme-dark .position-records[data-v] .ant-table-tbody > tr > td,
.theme-dark [class*="position-records"][data-v] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .position-records[data-v] .ant-table-thead > tr > th,
.theme-dark [class*="position-records"][data-v] .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}
</style>

<style lang="less">
// 暗黑主题适配 - 使用最高优先级的选择器覆盖 scoped 样式
// 关键：必须使用与 scoped 样式完全相同的选择器结构，加上 theme-dark 前缀
// 使用属性选择器的精确匹配来覆盖 scoped 样式

// 方法1：精确匹配 data-v-6c1eb557
.theme-dark .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
.theme-dark [data-v-6c1eb557].position-records .ant-table-tbody > tr > td,
.theme-dark [data-v-6c1eb557] .position-records .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

// 方法2：使用属性选择器前缀匹配（更通用）
.theme-dark [data-v-6c1eb557] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
.theme-dark [data-v-6c1eb557].position-records .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .position-records[data-v-6c1eb557] .ant-table,
.theme-dark [data-v-6c1eb557].position-records .ant-table {
  background: #1c1c1c !important;
  color: #d1d4dc !important;
}

.theme-dark .position-records[data-v-6c1eb557] .ant-table-tbody > tr:hover > td,
.theme-dark [data-v-6c1eb557].position-records .ant-table-tbody > tr:hover > td {
  background: #2a2e39 !important;
}

// body.dark 和 body.realdark 支持
body.dark .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
body.dark [data-v-6c1eb557].position-records .ant-table-tbody > tr > td,
body.dark [data-v-6c1eb557] .position-records .ant-table-tbody > tr > td,
body.realdark .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
body.realdark [data-v-6c1eb557].position-records .ant-table-tbody > tr > td,
body.realdark [data-v-6c1eb557] .position-records .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

// 方法2：使用属性选择器前缀匹配（更通用）
body.dark [data-v-6c1eb557] .ant-table-tbody > tr > td,
body.realdark [data-v-6c1eb557] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

body.dark .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
body.dark [data-v-6c1eb557].position-records .ant-table-thead > tr > th,
body.dark [data-v-6c1eb557] .position-records .ant-table-thead > tr > th,
body.realdark .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
body.realdark [data-v-6c1eb557].position-records .ant-table-thead > tr > th,
body.realdark [data-v-6c1eb557] .position-records .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

// 方法2：使用属性选择器前缀匹配（更通用）
body.dark [data-v-6c1eb557] .ant-table-thead > tr > th,
body.realdark [data-v-6c1eb557] .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

// 通用后备选择器（如果 data-v 值变化）
.theme-dark .position-records[data-v] .ant-table-tbody > tr > td,
body.dark .position-records[data-v] .ant-table-tbody > tr > td,
body.realdark .position-records[data-v] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .position-records[data-v] .ant-table-thead > tr > th,
body.dark .position-records[data-v] .ant-table-thead > tr > th,
body.realdark .position-records[data-v] .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

// 其他样式
.theme-dark .position-records[data-v-6c1eb557] .ant-empty .ant-empty-description,
body.dark .position-records[data-v-6c1eb557] .ant-empty .ant-empty-description,
body.realdark .position-records[data-v-6c1eb557] .ant-empty .ant-empty-description {
  color: #868993 !important;
}

.theme-dark .position-records[data-v-6c1eb557] .profit,
body.dark .position-records[data-v-6c1eb557] .profit,
body.realdark .position-records[data-v-6c1eb557] .profit {
  color: #52c41a !important;
}

.theme-dark .position-records[data-v-6c1eb557] .loss,
body.dark .position-records[data-v-6c1eb557] .loss,
body.realdark .position-records[data-v-6c1eb557] .loss {
  color: #ff4d4f !important;
}
</style>

<style lang="less">
// 最终覆盖方案：使用更长的选择器链确保最高优先级
// 直接匹配 scoped 样式生成的完整选择器路径
.theme-dark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
.theme-dark .trading-assistant [data-v-6c1eb557].position-records .ant-table-tbody > tr > td,
body.dark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
body.dark .trading-assistant [data-v-6c1eb557].position-records .ant-table-tbody > tr > td,
body.realdark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-tbody > tr > td,
body.realdark .trading-assistant [data-v-6c1eb557].position-records .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
.theme-dark .trading-assistant [data-v-6c1eb557].position-records .ant-table-thead > tr > th,
body.dark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
body.dark .trading-assistant [data-v-6c1eb557].position-records .ant-table-thead > tr > th,
body.realdark .trading-assistant .position-records[data-v-6c1eb557] .ant-table-thead > tr > th,
body.realdark .trading-assistant [data-v-6c1eb557].position-records .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

// 暗黑主题滚动条样式
.theme-dark .position-records[data-v-6c1eb557] .ant-table-body,
.theme-dark .position-records[data-v-6c1eb557] .ant-table-container,
.theme-dark .position-records[data-v-6c1eb557] .ant-table-content,
.theme-dark .position-records[data-v-6c1eb557] .ant-table-wrapper,
body.dark .position-records[data-v-6c1eb557] .ant-table-body,
body.dark .position-records[data-v-6c1eb557] .ant-table-container,
body.dark .position-records[data-v-6c1eb557] .ant-table-content,
body.dark .position-records[data-v-6c1eb557] .ant-table-wrapper,
body.realdark .position-records[data-v-6c1eb557] .ant-table-body,
body.realdark .position-records[data-v-6c1eb557] .ant-table-container,
body.realdark .position-records[data-v-6c1eb557] .ant-table-content,
body.realdark .position-records[data-v-6c1eb557] .ant-table-wrapper {
  scrollbar-width: thin;
  scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(209, 212, 220, 0.3);
    border-radius: 3px;
    &:hover {
      background: rgba(209, 212, 220, 0.5);
    }
  }
}

// 通用后备选择器
.theme-dark .position-records[data-v] .ant-table-body,
.theme-dark .position-records[data-v] .ant-table-container,
.theme-dark .position-records[data-v] .ant-table-content,
.theme-dark .position-records[data-v] .ant-table-wrapper,
body.dark .position-records[data-v] .ant-table-body,
body.dark .position-records[data-v] .ant-table-container,
body.dark .position-records[data-v] .ant-table-content,
body.dark .position-records[data-v] .ant-table-wrapper,
body.realdark .position-records[data-v] .ant-table-body,
body.realdark .position-records[data-v] .ant-table-container,
body.realdark .position-records[data-v] .ant-table-content,
body.realdark .position-records[data-v] .ant-table-wrapper {
  scrollbar-width: thin;
  scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(209, 212, 220, 0.3);
    border-radius: 3px;
    &:hover {
      background: rgba(209, 212, 220, 0.5);
    }
  }
}
</style>
