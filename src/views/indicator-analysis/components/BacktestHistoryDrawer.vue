<template>
  <a-drawer
    :title="$t('dashboard.indicator.backtest.historyTitle')"
    :visible="visible"
    :width="isMobile ? '100%' : 1060"
    :maskClosable="true"
    @close="$emit('cancel')"
    class="backtest-history-drawer"
  >
    <!-- 顶部工具栏 -->
    <div class="drawer-toolbar">
      <div class="toolbar-left">
        <a-button type="primary" :loading="loading" icon="reload" size="small" @click="loadRuns">
          {{ $t('dashboard.indicator.backtest.historyRefresh') }}
        </a-button>
        <a-button
          type="primary"
          ghost
          size="small"
          :disabled="selectedRowKeys.length === 0"
          :loading="analyzing"
          @click="handleAIAnalyze"
        >
          <a-icon type="bulb" />
          {{ $t('dashboard.indicator.backtest.historyAISuggest') }}
        </a-button>
        <span v-if="selectedRowKeys.length" class="selected-tip">
          {{ $t('dashboard.indicator.backtest.historySelectedCount', { count: selectedRowKeys.length }) }}
        </span>
      </div>
      <div class="toolbar-right">
        <a-input
          v-model="filterSymbol"
          style="width: 160px"
          size="small"
          allow-clear
          :placeholder="$t('dashboard.indicator.backtest.historyFilterSymbol')"
          @change="debouncedLoad"
        />
        <a-select
          v-model="filterTimeframe"
          style="width: 100px"
          size="small"
          :placeholder="$t('dashboard.indicator.backtest.historyFilterTimeframe')"
          allow-clear
          @change="loadRuns"
        >
          <a-select-option v-for="tf in timeframes" :key="tf" :value="tf">{{ tf }}</a-select-option>
        </a-select>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="runs"
      :loading="loading"
      size="small"
      :pagination="{ pageSize: 15, size: 'small' }"
      rowKey="id"
      :scroll="{ x: 1000 }"
      :rowSelection="{ selectedRowKeys: selectedRowKeys, onChange: onRowSelectionChange }"
    >
      <template slot="symbol" slot-scope="text, record">
        <span style="font-weight: 600;">{{ record.symbol || '-' }}</span>
        <a-tag v-if="record.market" size="small" style="margin-left: 4px;">{{ record.market }}</a-tag>
      </template>
      <template slot="range" slot-scope="text, record">
        <span>{{ (record.start_date || '').slice(0, 10) }} ~ {{ (record.end_date || '').slice(0, 10) }}</span>
      </template>
      <template slot="returnPct" slot-scope="text">
        <span v-if="text !== null && text !== undefined" :style="{ color: text >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }">
          {{ text >= 0 ? '+' : '' }}{{ Number(text).toFixed(2) }}%
        </span>
        <span v-else>-</span>
      </template>
      <template slot="createdAt" slot-scope="text">
        <span>{{ formatLocalDateTime(text) }}</span>
      </template>
      <template slot="status" slot-scope="text">
        <a-tag :color="text === 'success' ? 'green' : text === 'failed' ? 'red' : 'blue'">
          {{ text === 'success' ? $t('dashboard.indicator.backtest.historyStatusSuccess') : text === 'failed' ? $t('dashboard.indicator.backtest.historyStatusFailed') : text }}
        </a-tag>
      </template>
      <template slot="actions" slot-scope="text, record">
        <a-button type="link" size="small" :loading="detailLoadingId === record.id" @click="viewRun(record)">
          {{ $t('dashboard.indicator.backtest.historyView') }}
        </a-button>
        <a-button
          type="link"
          size="small"
          :loading="analyzingRunId === record.id"
          @click="handleAIAnalyze(record)"
        >
          {{ $t('dashboard.indicator.backtest.historyAISuggestShort') }}
        </a-button>
      </template>
    </a-table>

    <a-empty v-if="!loading && runs.length === 0" :description="$t('dashboard.indicator.backtest.historyNoData')" />

    <!-- AI 修正建议 Modal -->
    <a-modal
      :title="$t('dashboard.indicator.backtest.historyAISuggestTitle')"
      :visible="showAIResult"
      :footer="null"
      :width="isMobile ? '100%' : 900"
      @cancel="showAIResult = false"
    >
      <div v-if="analyzing" style="padding: 24px 0; text-align: center;">
        <a-spin size="large" />
        <div style="margin-top: 12px; color: #999;">{{ $t('dashboard.indicator.backtest.historyAISuggestLoading') }}</div>
      </div>
      <div v-else class="ai-modal-content">
        <div class="ai-meta-card">
          <div class="ai-meta-top">
            <div class="ai-meta-left">
              <a-tag color="blue">{{ $t('dashboard.indicator.backtest.historyAISuggest') }}</a-tag>
              <a-tag>{{ aiModeLabel }}</a-tag>
              <a-tag v-if="lastAnalyzeRunIds.length">{{ $t('dashboard.indicator.backtest.historySelectedCount', { count: lastAnalyzeRunIds.length }) }}</a-tag>
            </div>
            <div class="ai-meta-actions">
              <a-button size="small" @click="copyAIResult">
                <a-icon type="copy" />
                {{ $t('dashboard.indicator.backtest.historyAICopy') }}
              </a-button>
              <a-button size="small" type="primary" ghost :disabled="!lastAnalyzeRunIds.length" @click="handleAIAnalyze(null, lastAnalyzeRunIds)">
                <a-icon type="redo" />
                {{ $t('dashboard.indicator.backtest.historyAIRetry') }}
              </a-button>
            </div>
          </div>
          <div v-if="analyzeRunSummaries.length" class="ai-run-tags">
            <a-tag v-for="item in analyzeRunSummaries" :key="item.id" color="purple">
              #{{ item.id }} {{ item.symbol || '-' }} / {{ item.timeframe || '-' }}
            </a-tag>
          </div>
          <a-alert
            type="info"
            show-icon
            :message="$t('dashboard.indicator.backtest.historyAIHint')"
            style="margin-top: 12px;"
          />
        </div>

        <div v-if="aiResult" class="ai-markdown-card">
          <div class="ai-markdown-content" v-html="renderedAIHtml" />
        </div>

        <div v-else class="ai-result-content">
          {{ $t('dashboard.indicator.backtest.historyNoAIResult') }}
        </div>
      </div>
    </a-modal>
  </a-drawer>
</template>

<script>
import request, { ANALYSIS_TIMEOUT } from '@/utils/request'

export default {
  name: 'BacktestHistoryDrawer',
  props: {
    visible: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    indicatorId: { type: [Number, String], default: null },
    strategyId: { type: [Number, String], default: null },
    runType: { type: String, default: '' },
    symbol: { type: String, default: '' },
    market: { type: String, default: '' },
    timeframe: { type: String, default: '' },
    isMobile: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      detailLoadingId: null,
      analyzing: false,
      showAIResult: false,
      aiResult: '',
      filterSymbol: '',
      filterTimeframe: undefined,
      timeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      runs: [],
      columns: [],
      selectedRowKeys: [],
      debounceTimer: null,
      analyzingRunId: null,
      lastAnalyzeRunIds: [],
      aiMode: ''
    }
  },
  computed: {
    isStrategyHistory () {
      return !!this.strategyId || String(this.runType || '').indexOf('strategy_') === 0
    },
    aiModeLabel () {
      if (this.aiMode === 'llm') return this.$t('dashboard.indicator.backtest.historyAIModeLLM')
      if (this.aiMode === 'heuristic' || this.aiMode === 'heuristic_fallback') return this.$t('dashboard.indicator.backtest.historyAIModeRule')
      return this.$t('dashboard.indicator.backtest.historyAIModeUnknown')
    },
    analyzeRunSummaries () {
      const idSet = new Set((this.lastAnalyzeRunIds || []).map(id => Number(id)))
      return (this.runs || []).filter(item => idSet.has(Number(item.id))).slice(0, 8)
    },
    renderedAIHtml () {
      return this.markdownToHtml(this.aiResult || '')
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.initColumns()
        this.filterSymbol = ''
        this.filterTimeframe = undefined
        this.selectedRowKeys = []
        this.aiResult = ''
        this.aiMode = ''
        this.lastAnalyzeRunIds = []
        this.showAIResult = false
        this.loadRuns()
      }
    }
  },
  methods: {
    onRowSelectionChange (keys) {
      this.selectedRowKeys = keys || []
    },
    debouncedLoad () {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => this.loadRuns(), 400)
    },
    initColumns () {
      const columns = [
        { title: '#', dataIndex: 'id', key: 'id', width: 60 },
        ...(this.isStrategyHistory ? [{ title: this.$t('backtest-center.strategy.selectStrategy') || 'Strategy', dataIndex: 'strategy_name', key: 'strategy_name', width: 180 }] : []),
        { title: this.$t('dashboard.indicator.backtest.historySymbol') || 'Symbol', key: 'symbol', width: 150, scopedSlots: { customRender: 'symbol' } },
        { title: this.$t('dashboard.indicator.backtest.timeframe') || 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70 },
        { title: this.$t('dashboard.indicator.backtest.historyRange'), key: 'range', width: 180, scopedSlots: { customRender: 'range' } },
        { title: this.$t('dashboard.indicator.backtest.tradeDirection'), dataIndex: 'trade_direction', key: 'trade_direction', width: 80 },
        { title: this.$t('dashboard.indicator.backtest.leverage'), dataIndex: 'leverage', key: 'leverage', width: 60 },
        { title: this.$t('dashboard.indicator.backtest.totalReturn') || 'Return', dataIndex: 'total_return', key: 'total_return', width: 100, scopedSlots: { customRender: 'returnPct' } },
        { title: this.$t('dashboard.indicator.backtest.historyStatus'), dataIndex: 'status', key: 'status', width: 80, scopedSlots: { customRender: 'status' } },
        { title: this.$t('dashboard.indicator.backtest.historyCreatedAt'), dataIndex: 'created_at', key: 'created_at', width: 180, scopedSlots: { customRender: 'createdAt' } },
        { title: '', key: 'actions', width: 180, scopedSlots: { customRender: 'actions' } }
      ]
      this.columns = columns
    },
    formatLocalDateTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString()
    },
    async copyAIResult () {
      if (!this.aiResult) return
      try {
        await navigator.clipboard.writeText(this.aiResult)
        this.$message.success(this.$t('dashboard.indicator.backtest.historyAICopySuccess'))
      } catch (e) {
        this.$message.warning(this.$t('dashboard.indicator.backtest.historyAICopyFailed'))
      }
    },
    escapeHtml (str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    formatInlineMarkdown (str) {
      let text = this.escapeHtml(str)
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>')
      text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
      return text
    },
    markdownToHtml (markdown) {
      const text = String(markdown || '').replace(/\r\n/g, '\n').trim()
      if (!text) return ''

      const lines = text.split('\n')
      const html = []
      let inUl = false
      let inOl = false
      let inCode = false
      let codeLines = []

      const closeLists = () => {
        if (inUl) {
          html.push('</ul>')
          inUl = false
        }
        if (inOl) {
          html.push('</ol>')
          inOl = false
        }
      }

      for (const rawLine of lines) {
        const line = rawLine.trimRight()
        const trimmed = line.trim()

        if (trimmed.startsWith('```')) {
          closeLists()
          if (!inCode) {
            inCode = true
            codeLines = []
          } else {
            html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`)
            inCode = false
            codeLines = []
          }
          continue
        }

        if (inCode) {
          codeLines.push(rawLine)
          continue
        }

        if (!trimmed) {
          closeLists()
          continue
        }

        if (/^###\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h3>${this.formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h3>`)
          continue
        }
        if (/^##\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h2>${this.formatInlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h2>`)
          continue
        }
        if (/^#\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h1>${this.formatInlineMarkdown(trimmed.replace(/^#\s+/, ''))}</h1>`)
          continue
        }
        if (/^【.+】$/.test(trimmed)) {
          closeLists()
          html.push(`<h3>${this.formatInlineMarkdown(trimmed.replace(/^【|】$/g, ''))}</h3>`)
          continue
        }
        if (/^>\s+/.test(trimmed)) {
          closeLists()
          html.push(`<blockquote>${this.formatInlineMarkdown(trimmed.replace(/^>\s+/, ''))}</blockquote>`)
          continue
        }
        if (/^[-*]\s+/.test(trimmed)) {
          if (inOl) {
            html.push('</ol>')
            inOl = false
          }
          if (!inUl) {
            html.push('<ul>')
            inUl = true
          }
          html.push(`<li>${this.formatInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`)
          continue
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          if (inUl) {
            html.push('</ul>')
            inUl = false
          }
          if (!inOl) {
            html.push('<ol>')
            inOl = true
          }
          html.push(`<li>${this.formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
          continue
        }

        closeLists()
        html.push(`<p>${this.formatInlineMarkdown(trimmed)}</p>`)
      }

      closeLists()
      if (inCode) {
        html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`)
      }
      return html.join('')
    },
    async loadRuns () {
      if (!this.userId) return
      this.loading = true
      try {
        const params = {
          userid: this.userId,
          limit: 200,
          offset: 0
        }
        if (this.indicatorId) params.indicatorId = this.indicatorId
        if (this.strategyId) params.strategyId = this.strategyId
        if (this.runType) params.runType = this.runType
        if (this.filterSymbol) params.symbol = this.filterSymbol
        if (this.filterTimeframe) params.timeframe = this.filterTimeframe
        const res = await request({
          url: this.isStrategyHistory ? '/api/strategies/backtest/history' : '/api/indicator/backtest/history',
          method: 'get',
          params
        })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.runs = res.data
        } else {
          this.runs = []
        }
      } finally {
        this.loading = false
      }
    },
    async viewRun (record) {
      if (!record || !record.id) return
      this.detailLoadingId = record.id
      try {
        const res = await request({
          url: this.isStrategyHistory ? '/api/strategies/backtest/get' : '/api/indicator/backtest/get',
          method: 'get',
          params: { userid: this.userId, runId: record.id }
        })
        if (res && res.code === 1 && res.data) {
          this.$emit('view', res.data)
        }
      } finally {
        this.detailLoadingId = null
      }
    },
    async handleAIAnalyze (record = null, forcedRunIds = null) {
      const runIds = forcedRunIds || (record && record.id ? [record.id] : this.selectedRowKeys)
      if (!this.userId) return
      if (!runIds || !runIds.length) {
        this.$message.warning(this.$t('dashboard.indicator.backtest.historyAISelectPrompt'))
        return
      }
      this.analyzing = true
      this.analyzingRunId = record && record.id ? record.id : null
      this.lastAnalyzeRunIds = [...runIds]
      this.showAIResult = true
      this.aiResult = ''
      this.aiMode = ''
      try {
        const lang = (this.$i18n && this.$i18n.locale) ? this.$i18n.locale : 'zh-CN'
        const res = await request({
          url: '/api/indicator/backtest/aiAnalyze',
          method: 'post',
          timeout: ANALYSIS_TIMEOUT,
          data: { userid: this.userId, runIds, lang }
        })
        if (res && res.code === 1 && res.data && res.data.analysis) {
          this.aiResult = res.data.analysis
          this.aiMode = res.data.mode || ''
        } else {
          this.aiResult = res.msg || this.$t('dashboard.indicator.backtest.historyNoAIResult')
        }
      } catch (e) {
        this.aiResult = (e && e.message) || this.$t('dashboard.indicator.backtest.historyAIFailed')
      } finally {
        this.analyzing = false
        this.analyzingRunId = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.drawer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
.selected-tip {
  font-size: 12px;
  color: #8c8c8c;
}
.ai-modal-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ai-meta-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  background: #fafafa;
}
.ai-meta-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.ai-meta-left, .ai-meta-actions, .ai-run-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ai-markdown-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 18px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}
.ai-markdown-content {
  color: #262626;
  font-size: 14px;
  line-height: 1.8;
  /deep/ h1,
  /deep/ h2,
  /deep/ h3 {
    margin: 0 0 12px;
    font-weight: 700;
    color: #1f1f1f;
    line-height: 1.5;
  }
  /deep/ h1 { font-size: 20px; }
  /deep/ h2 { font-size: 17px; }
  /deep/ h3 {
    font-size: 15px;
    padding-left: 10px;
    border-left: 3px solid #1890ff;
  }
  /deep/ p {
    margin: 0 0 12px;
    color: #434343;
  }
  /deep/ ul,
  /deep/ ol {
    margin: 0 0 14px 20px;
    padding: 0;
  }
  /deep/ li {
    margin-bottom: 8px;
    color: #434343;
  }
  /deep/ strong {
    color: #262626;
    font-weight: 700;
  }
  /deep/ em {
    color: #595959;
  }
  /deep/ code {
    padding: 2px 6px;
    border-radius: 6px;
    background: #f5f5f5;
    color: #cf1322;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }
  /deep/ pre {
    overflow: auto;
    margin: 0 0 14px;
    padding: 14px;
    border-radius: 10px;
    background: #141414;
    color: #f0f0f0;
  }
  /deep/ pre code {
    padding: 0;
    background: transparent;
    color: inherit;
  }
  /deep/ blockquote {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-left: 4px solid #91d5ff;
    border-radius: 0 8px 8px 0;
    background: #f0f7ff;
    color: #595959;
  }
}
.ai-result-content {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  padding: 8px 0;
}
</style>
