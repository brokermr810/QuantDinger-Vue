<template>
  <div class="backtest-center" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="experiment" class="title-icon" />
        {{ $t('backtest-center.title') }}
      </h2>
      <p class="page-subtitle">{{ $t('backtest-center.subtitle') }}</p>
    </div>

    <a-tabs v-model="activeTab" class="main-tabs">
      <!-- ===== 指标回测 ===== -->
      <a-tab-pane key="indicator" :tab="$t('backtest-center.tabs.indicator')">
        <a-row :gutter="20" class="workspace">
          <!-- 左侧配置 -->
          <a-col :xs="24" :md="9" :lg="8" class="config-col">
            <div class="config-panel">
              <!-- 指标 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.indicator.selectIndicator') }}</div>
                <a-select
                  v-model="selectedIndicatorId"
                  :placeholder="$t('backtest-center.indicator.selectIndicatorPlaceholder')"
                  style="width: 100%"
                  :loading="loadingIndicators"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  @change="onIndicatorChange"
                >
                  <a-select-option
                    v-for="ind in indicators"
                    :key="ind.id"
                    :value="ind.id"
                  >{{ ind.name || ('Indicator #' + ind.id) }}</a-select-option>
                </a-select>
              </div>

              <!-- 交易标的（自选股） -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.symbol') }}</div>
                <a-select
                  v-model="selectedWatchlistKey"
                  :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                  style="width: 100%"
                  show-search
                  allow-clear
                  :filter-option="filterWatchlistOption"
                  @change="handleWatchlistChange"
                >
                  <a-select-option
                    v-for="w in watchlist"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <a-tag :color="getMarketColor(w.market)" size="small">{{ w.market }}</a-tag>
                    <strong style="margin-left: 4px;">{{ w.symbol }}</strong>
                    <span v-if="w.name" style="color: #999; margin-left: 4px; font-size: 12px;">{{ w.name }}</span>
                  </a-select-option>
                  <a-select-option key="__add__" value="__add__" class="add-option">
                    <div style="text-align: center; color: #1890ff;">
                      <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                    </div>
                  </a-select-option>
                </a-select>
              </div>

              <!-- 时间周期 -->
              <div class="section">
                <div class="section-title">
                  {{ $t('backtest-center.config.timeframe') }}
                  <span class="hint">{{ tfLimitHint }}</span>
                </div>
                <a-radio-group
                  v-model="timeframe"
                  button-style="solid"
                  size="small"
                  class="tf-group"
                  @change="onTimeframeChange"
                >
                  <a-radio-button value="1m">1m</a-radio-button>
                  <a-radio-button value="5m">5m</a-radio-button>
                  <a-radio-button value="15m">15m</a-radio-button>
                  <a-radio-button value="1H">1H</a-radio-button>
                  <a-radio-button value="4H">4H</a-radio-button>
                  <a-radio-button value="1D">1D</a-radio-button>
                  <a-radio-button value="1W">1W</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 回测日期 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.dateRange') }}</div>
                <div class="date-presets">
                  <a-button
                    v-for="p in filteredDatePresets"
                    :key="p.key"
                    size="small"
                    :type="datePreset === p.key ? 'primary' : 'default'"
                    @click="applyDatePreset(p)"
                  >{{ p.label }}</a-button>
                </div>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <a-date-picker
                      v-model="startDate"
                      :placeholder="$t('backtest-center.config.startDate')"
                      style="width: 100%"
                      size="small"
                    />
                  </a-col>
                  <a-col :span="12">
                    <a-date-picker
                      v-model="endDate"
                      :placeholder="$t('backtest-center.config.endDate')"
                      style="width: 100%"
                      size="small"
                    />
                  </a-col>
                </a-row>
              </div>

              <!-- 资金设置 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.capital') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.initialCapital') }}</div>
                    <a-input-number
                      v-model="initialCapital"
                      :min="1000"
                      :step="10000"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                      :parser="v => v.replace(/\$\s?|(,*)/g, '')"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.leverage') }}</div>
                    <a-input-number
                      v-model="leverage"
                      :min="1"
                      :max="125"
                      :step="1"
                      :precision="0"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `${v}x`"
                      :parser="v => v.replace('x', '')"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.commission') }} (%)</div>
                    <a-input-number
                      v-model="commission"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.slippage') }} (%)</div>
                    <a-input-number
                      v-model="slippage"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
              </div>

              <!-- 交易方向 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.direction') }}</div>
                <a-radio-group
                  v-model="tradeDirection"
                  size="small"
                  button-style="solid"
                >
                  <a-radio-button value="long">{{ $t('backtest-center.config.long') }}</a-radio-button>
                  <a-radio-button value="short">{{ $t('backtest-center.config.short') }}</a-radio-button>
                  <a-radio-button value="both">{{ $t('backtest-center.config.both') }}</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 风控参数（直接展示） -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.riskPanel') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.stopLoss') }} (%)</div>
                    <a-input-number
                      v-model="stopLossPct"
                      :min="0"
                      :max="100"
                      :step="0.5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.takeProfit') }} (%)</div>
                    <a-input-number
                      v-model="takeProfitPct"
                      :min="0"
                      :max="1000"
                      :step="0.5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.entryPct') }} (%)</div>
                    <a-input-number
                      v-model="entryPct"
                      :min="0"
                      :max="100"
                      :step="5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <a-checkbox
                      v-model="trailingEnabled"
                      style="margin-top: 18px;"
                    >{{ $t('backtest-center.config.trailing') }}</a-checkbox>
                  </a-col>
                </a-row>
                <template v-if="trailingEnabled">
                  <a-row :gutter="8" style="margin-top: 8px;">
                    <a-col :span="12">
                      <div class="field-label">{{ $t('backtest-center.config.trailingPct') }} (%)</div>
                      <a-input-number
                        v-model="trailingStopPct"
                        :min="0"
                        :max="100"
                        :step="0.5"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                      />
                    </a-col>
                    <a-col :span="12">
                      <div class="field-label">{{ $t('backtest-center.config.trailingActivation') }} (%)</div>
                      <a-input-number
                        v-model="trailingActivationPct"
                        :min="0"
                        :max="1000"
                        :step="0.5"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                      />
                    </a-col>
                  </a-row>
                </template>
              </div>

              <!-- 运行按钮 -->
              <div class="run-section">
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="running"
                  :disabled="!canRunIndicator"
                  @click="runIndicatorBacktest"
                >
                  <a-icon v-if="!running" type="thunderbolt" />
                  {{ running ? $t('backtest-center.running') : $t('backtest-center.indicator.runBacktest') }}
                </a-button>
                <a-button
                  block
                  style="margin-top: 8px;"
                  :disabled="!selectedIndicatorId"
                  @click="openHistory('indicator')"
                >
                  <a-icon type="history" />
                  {{ $t('backtest-center.indicator.history') }}
                </a-button>
              </div>
            </div>
          </a-col>

          <!-- 右侧结果 -->
          <a-col :xs="24" :md="15" :lg="16" class="result-col">
            <div class="result-panel">
              <result-view
                :running="running"
                :run-tip="runTip"
                :has-result="hasResult"
                :result="result"
                :user-id="userId"
                :backtestRunId="backtestRunId"
                :symbol="symbol"
                :market="market"
                :timeframe="timeframe"
                :is-dark="isDarkTheme"
              />
            </div>
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="strategy" :tab="$t('backtest-center.tabs.strategy')">
        <a-row :gutter="20" class="workspace">
          <a-col :xs="24" :md="9" :lg="8" class="config-col">
            <div class="config-panel">
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.strategy.selectStrategy') }}</div>
                <a-select
                  v-model="selectedStrategyId"
                  :placeholder="$t('backtest-center.strategy.selectStrategyPlaceholder')"
                  style="width: 100%"
                  :loading="loadingStrategies"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  @change="onStrategyChange"
                >
                  <a-select-option
                    v-for="s in strategies"
                    :key="s.id"
                    :value="s.id"
                  >{{ s.strategy_name || ('Strategy #' + s.id) }}</a-select-option>
                </a-select>
                <div v-if="selectedStrategyObj" class="strategy-summary-card">
                  <div class="strategy-summary-head">
                    <div class="strategy-summary-title">{{ selectedStrategyObj.strategy_name || ('Strategy #' + selectedStrategyObj.id) }}</div>
                    <a-tag size="small" :color="strategyTypeColor(selectedStrategyObj)">{{ strategyTypeLabel(selectedStrategyObj) }}</a-tag>
                  </div>
                  <div class="strategy-summary-meta">
                    <a-tag v-if="selectedStrategyObj.market_category" size="small">{{ selectedStrategyObj.market_category }}</a-tag>
                    <a-tag v-if="selectedStrategyObj.symbol" size="small">{{ selectedStrategyObj.symbol }}</a-tag>
                    <a-tag v-if="selectedStrategyObj.timeframe" size="small">{{ selectedStrategyObj.timeframe }}</a-tag>
                  </div>
                  <div class="strategy-summary-text">{{ strategySummaryText(selectedStrategyObj) }}</div>
                  <a-button type="link" size="small" style="padding-left: 0;" @click="goToStrategyEditor(selectedStrategyObj)">
                    {{ $t('backtest-center.strategy.goToAssistant') }}
                  </a-button>
                </div>
              </div>

              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.symbol') }}</div>
                <a-select
                  v-model="stSelectedWatchlistKey"
                  :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                  style="width: 100%"
                  show-search
                  allow-clear
                  :filter-option="filterWatchlistOption"
                  @change="handleStWatchlistChange"
                >
                  <a-select-option
                    v-for="w in watchlist"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <a-tag :color="getMarketColor(w.market)" size="small">{{ w.market }}</a-tag>
                    <strong style="margin-left: 4px;">{{ w.symbol }}</strong>
                    <span v-if="w.name" style="color: #999; margin-left: 4px; font-size: 12px;">{{ w.name }}</span>
                  </a-select-option>
                  <a-select-option key="__add__" value="__add__" class="add-option">
                    <div style="text-align: center; color: #1890ff;">
                      <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                    </div>
                  </a-select-option>
                </a-select>
              </div>

              <div class="section">
                <div class="section-title">
                  {{ $t('backtest-center.config.timeframe') }}
                  <span class="hint">{{ stTfLimitHint }}</span>
                </div>
                <a-radio-group
                  v-model="stTimeframe"
                  button-style="solid"
                  size="small"
                  class="tf-group"
                  @change="onStTimeframeChange"
                >
                  <a-radio-button value="1m">1m</a-radio-button>
                  <a-radio-button value="5m">5m</a-radio-button>
                  <a-radio-button value="15m">15m</a-radio-button>
                  <a-radio-button value="1H">1H</a-radio-button>
                  <a-radio-button value="4H">4H</a-radio-button>
                  <a-radio-button value="1D">1D</a-radio-button>
                  <a-radio-button value="1W">1W</a-radio-button>
                </a-radio-group>
              </div>

              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.dateRange') }}</div>
                <div class="date-presets">
                  <a-button
                    v-for="p in stFilteredDatePresets"
                    :key="'st-' + p.key"
                    size="small"
                    :type="stDatePreset === p.key ? 'primary' : 'default'"
                    @click="applyStDatePreset(p)"
                  >{{ p.label }}</a-button>
                </div>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <a-date-picker v-model="stStartDate" :placeholder="$t('backtest-center.config.startDate')" style="width: 100%" size="small" />
                  </a-col>
                  <a-col :span="12">
                    <a-date-picker v-model="stEndDate" :placeholder="$t('backtest-center.config.endDate')" style="width: 100%" size="small" />
                  </a-col>
                </a-row>
              </div>

              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.capital') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.initialCapital') }}</div>
                    <a-input-number
                      v-model="stInitialCapital"
                      :min="1000"
                      :step="10000"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                      :parser="v => v.replace(/\$\s?|(,*)/g, '')"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.leverage') }}</div>
                    <a-input-number
                      v-model="stLeverage"
                      :min="1"
                      :max="125"
                      :step="1"
                      :precision="0"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `${v}x`"
                      :parser="v => v.replace('x', '')"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.commission') }} (%)</div>
                    <a-input-number
                      v-model="stCommission"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.slippage') }} (%)</div>
                    <a-input-number
                      v-model="stSlippage"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
              </div>

              <div class="run-section">
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="stRunning"
                  :disabled="!canRunStrategy"
                  @click="runStrategyBacktest"
                >
                  <a-icon v-if="!stRunning" type="thunderbolt" />
                  {{ stRunning ? $t('backtest-center.strategy.running') : $t('backtest-center.strategy.runBacktest') }}
                </a-button>
                <a-button
                  block
                  style="margin-top: 8px;"
                  :disabled="!selectedStrategyId"
                  @click="openHistory('strategy')"
                >
                  <a-icon type="history" />
                  {{ $t('backtest-center.strategy.history') }}
                </a-button>
              </div>
            </div>
          </a-col>

          <a-col :xs="24" :md="15" :lg="16" class="result-col">
            <div class="result-panel">
              <result-view
                :running="stRunning"
                :run-tip="stRunTip"
                :has-result="stHasResult"
                :result="stResult"
                :user-id="userId"
                :backtestRunId="stBacktestRunId"
                :symbol="stSymbol"
                :market="stMarket"
                :timeframe="stTimeframe"
                :is-dark="isDarkTheme"
              />
            </div>
          </a-col>
        </a-row>
      </a-tab-pane>

    </a-tabs>

    <!-- 添加自选股弹窗 -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddModal"
      @ok="handleAddStock"
      @cancel="showAddModal = false"
      :confirmLoading="addingStock"
      width="560px"
      :wrap-class-name="isDarkTheme ? 'bc-modal-wrap bc-modal-wrap--dark' : 'bc-modal-wrap'"
    >
      <a-tabs v-model="addMarketTab" size="small" @change="onAddMarketTabChange">
        <a-tab-pane key="Crypto" tab="Crypto" />
        <a-tab-pane key="USStock" tab="US Stock" />
        <a-tab-pane key="HKStock" tab="HK Stock" />
        <a-tab-pane key="Forex" tab="Forex" />
        <a-tab-pane key="Futures" tab="Futures" />
      </a-tabs>
      <a-input-search
        v-model="addSearchKeyword"
        :placeholder="$t('backtest-center.config.symbolPlaceholder')"
        @search="doAddSearch"
        @change="onAddSearchInput"
        :loading="addSearching"
        size="large"
        allow-clear
        style="margin: 12px 0;"
      />
      <a-list
        v-if="addSearchResults.length > 0"
        size="small"
        :data-source="addSearchResults"
        style="max-height: 240px; overflow-y: auto;"
      >
        <a-list-item
          slot="renderItem"
          slot-scope="item"
          style="cursor: pointer;"
          :class="{ 'add-item-active': addSelectedItem && addSelectedItem.symbol === item.symbol }"
          @click="addSelectedItem = item"
        >
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.name" style="color: #999; margin-left: 8px;">{{ item.name }}</span>
          <a-icon v-if="addSelectedItem && addSelectedItem.symbol === item.symbol" type="check-circle" theme="filled" style="color: #52c41a; margin-left: auto;" />
        </a-list-item>
      </a-list>
      <div v-if="addSearchResults.length === 0 && addSearchKeyword && addSearched" style="padding: 16px 0; text-align: center; color: #999;">
        {{ $t('backtest-center.config.noSearchResult') }}
      </div>
    </a-modal>

    <!-- 回测历史 -->
    <backtest-history-drawer
      :visible="showHistoryDrawer"
      :userId="userId"
      :indicatorId="historyIndicatorId"
      :strategyId="historyStrategyId"
      :runType="historyRunType"
      :isMobile="false"
      @cancel="showHistoryDrawer = false"
      @view="handleViewRun"
    />
    <backtest-run-viewer
      :visible="showRunViewer"
      :run="selectedRun"
      @cancel="showRunViewer = false; selectedRun = null"
    />
  </div>
</template>

<script>
import moment from 'moment'
import * as echarts from 'echarts'
import { baseMixin } from '@/store/app-mixin'
import request, { ANALYSIS_TIMEOUT } from '@/utils/request'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import { getStrategyList, runStrategyBacktest as runStrategyBacktestApi } from '@/api/strategy'
import BacktestHistoryDrawer from '@/views/indicator-analysis/components/BacktestHistoryDrawer.vue'
import BacktestRunViewer from '@/views/indicator-analysis/components/BacktestRunViewer.vue'

const TF_MAX_DAYS = {
  '1m': 30,
  '5m': 180,
  '15m': 365,
  '30m': 365,
  '1H': 730,
  '4H': 1460,
  '1D': 3650,
  '1W': 7300
}

const DATE_PRESETS = [
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '2y', label: '2Y', days: 730 },
  { key: '5y', label: '5Y', days: 1825 }
]

const ResultView = {
  name: 'ResultView',
  props: {
    running: Boolean,
    runTip: String,
    hasResult: Boolean,
    result: Object,
    userId: [Number, String],
    backtestRunId: [Number, String],
    symbol: String,
    market: String,
    timeframe: String,
    isDark: Boolean
  },
  data () {
    return {
      chartInstance: null,
      elapsedSec: 0,
      elapsedTimer: null,
      aiAnalyzing: false,
      showAIResult: false,
      aiResult: '',
      aiMode: ''
    }
  },
  mounted () {
    if (this.running) this._startElapsed()
  },
  computed: {
    aiModeLabel () {
      if (this.aiMode === 'llm') return this.$t('dashboard.indicator.backtest.historyAIModeLLM')
      if (this.aiMode === 'heuristic' || this.aiMode === 'heuristic_fallback') return this.$t('dashboard.indicator.backtest.historyAIModeRule')
      return this.$t('dashboard.indicator.backtest.historyAIModeUnknown')
    },
    renderedAIHtml () {
      return this.markdownToHtml(this.aiResult || '')
    },
    pairedTrades () {
      const raw = (this.result && this.result.trades) || []
      const pairs = []
      let openTrade = null
      let idx = 1
      for (let i = 0; i < raw.length; i++) {
        const t = raw[i]
        const nextTrade = raw[i + 1]
        const ty = (t.type || '').toLowerCase()
        if (ty.startsWith('open_') || ty === 'buy') {
          openTrade = t
        } else if (openTrade) {
          const direction = openTrade.type.includes('long') || openTrade.type === 'buy' ? 'long' : 'short'
          const closeReason = this.getCloseReason(ty, t, nextTrade)
          pairs.push({
            id: idx++,
            type: direction,
            openAction: direction === 'long' ? 'openLong' : 'openShort',
            closeReason,
            closeType: ty,
            entryDate: openTrade.time || '',
            exitDate: t.time || '',
            entryPrice: openTrade.price,
            exitPrice: t.price,
            amount: openTrade.amount || t.amount || 0,
            profit: t.profit || 0,
            balance: t.balance != null ? t.balance : (openTrade.balance != null ? openTrade.balance : 0)
          })
          openTrade = null
        }
      }
      return pairs
    },
    tradeColumns () {
      return [
        { title: '#', dataIndex: 'id', width: 50 },
        { title: this.$t('backtest-center.result.colType'), dataIndex: 'type', scopedSlots: { customRender: 'type' }, width: 80 },
        { title: this.$t('backtest-center.result.colOpenAction'), dataIndex: 'openAction', scopedSlots: { customRender: 'openAction' }, width: 90 },
        { title: this.$t('backtest-center.result.colCloseReason'), dataIndex: 'closeReason', scopedSlots: { customRender: 'closeReason' }, width: 120 },
        { title: this.$t('backtest-center.result.colEntry'), dataIndex: 'entryDate', width: 140 },
        { title: this.$t('backtest-center.result.colExit'), dataIndex: 'exitDate', width: 140 },
        { title: this.$t('backtest-center.result.colEntryPrice'), dataIndex: 'entryPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('backtest-center.result.colExitPrice'), dataIndex: 'exitPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('backtest-center.result.colProfit'), dataIndex: 'profit', scopedSlots: { customRender: 'profit' }, width: 120 },
        { title: this.$t('backtest-center.result.colBalance'), dataIndex: 'balance', scopedSlots: { customRender: 'money' }, width: 130 }
      ]
    }
  },
  watch: {
    running (val) {
      if (val) { this._startElapsed() } else { this._stopElapsed() }
    },
    hasResult (val) {
      if (val) this.$nextTick(() => this.renderChart())
    },
    isDark () {
      if (this.hasResult) this.$nextTick(() => this.renderChart())
    }
  },
  beforeDestroy () {
    if (this.chartInstance) this.chartInstance.dispose()
    this._stopElapsed()
  },
  methods: {
    _startElapsed () {
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)
    },
    _stopElapsed () {
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = null
    },
    fmtElapsed (s) {
      if (s < 60) return `${s}s`
      return `${Math.floor(s / 60)}m ${s % 60}s`
    },
    fmtPct (v) {
      if (v == null || isNaN(v)) return '--'
      const sign = v >= 0 ? '+' : ''
      return sign + Number(v).toFixed(2) + '%'
    },
    fmtMoney (v) {
      if (v == null || isNaN(v)) return '$0.00'
      const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return (v >= 0 ? '' : '-') + '$' + abs
    },
    fmtPrice (v) {
      if (v == null || isNaN(v)) return '--'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
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
      if (inCode) html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`)
      return html.join('')
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
    async handleAIAnalyze () {
      const runId = this.backtestRunId
      if (!this.userId || !runId) {
        this.$message.warning(this.$t('dashboard.indicator.backtest.historyAISelectPrompt'))
        return
      }
      this.aiAnalyzing = true
      this.showAIResult = true
      this.aiResult = ''
      this.aiMode = ''
      try {
        const lang = (this.$i18n && this.$i18n.locale) ? this.$i18n.locale : 'zh-CN'
        const res = await request({
          url: '/api/indicator/backtest/aiAnalyze',
          method: 'post',
          timeout: ANALYSIS_TIMEOUT,
          data: { userid: this.userId, runIds: [runId], lang }
        })
        if (res && res.code === 1 && res.data && res.data.analysis) {
          this.aiResult = res.data.analysis
          this.aiMode = res.data.mode || ''
        } else {
          this.aiResult = (res && res.msg) || this.$t('dashboard.indicator.backtest.historyNoAIResult')
        }
      } catch (e) {
        this.aiResult = (e && e.message) || this.$t('dashboard.indicator.backtest.historyAIFailed')
      } finally {
        this.aiAnalyzing = false
      }
    },
    getCloseReason (closeType, closeTrade, nextTrade) {
      if (closeType.includes('_stop')) return 'stopLoss'
      if (closeType.includes('_profit')) return 'takeProfit'
      if (closeType.includes('_trailing')) return 'trailingStop'
      if (closeType === 'liquidation') return 'liquidation'
      if ((closeType === 'close_long' || closeType === 'close_short') && nextTrade) {
        const nextType = String(nextTrade.type || '').toLowerCase()
        const sameTime = String(nextTrade.time || '') === String(closeTrade.time || '')
        if (sameTime && (nextType === 'open_long' || nextType === 'open_short')) return 'reverse'
      }
      return 'signal'
    },
    reasonColor (reason) {
      return {
        stopLoss: 'red',
        takeProfit: 'green',
        trailingStop: 'cyan',
        reverse: 'orange',
        liquidation: 'volcano',
        signal: 'blue'
      }[reason] || 'default'
    },
    renderChart () {
      const r = this.result
      if (!r || !r.equityCurve || !r.equityCurve.length) return
      const dom = this.$refs.eqChart
      if (!dom) return
      if (this.chartInstance) this.chartInstance.dispose()
      this.chartInstance = echarts.init(dom)
      const dk = this.isDark
      const data = r.equityCurve
      const isPositive = data.length > 1 && (data[data.length - 1].value || 0) >= (data[0].value || 0)
      const lineColor = isPositive ? '#52c41a' : '#f5222d'
      this.chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.85)' : '#333', fontSize: 12 },
          formatter: (params) => {
            const p = params[0]
            return `<div style="font-size:11px;color:${dk ? 'rgba(255,255,255,0.5)' : '#999'}">${p.name}</div><div style="font-size:13px;font-weight:600;color:${dk ? 'rgba(255,255,255,0.85)' : '#333'}">$${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>`
          }
        },
        grid: { left: 65, right: 20, top: 20, bottom: 30 },
        xAxis: {
          type: 'category',
          data: data.map(d => d.time || ''),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 10, rotate: 0, interval: Math.floor(data.length / 6) },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 11, formatter: v => '$' + (v / 1000).toFixed(1) + 'k' },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [{
          type: 'line',
          data: data.map(d => d.value || 0),
          smooth: 0.3,
          showSymbol: false,
          lineStyle: { width: 2, color: lineColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isPositive ? 'rgba(82,196,26,0.2)' : 'rgba(245,34,45,0.2)' },
              { offset: 1, color: 'rgba(0,0,0,0)' }
            ])
          }
        }]
      })
      window.addEventListener('resize', () => { if (this.chartInstance) this.chartInstance.resize() })
    }
  },
  render (h) {
    const dk = this.isDark

    if (this.running) {
      const steps = [
        { key: 'fetch', label: this.$t('backtest-center.tip.fetching'), icon: 'cloud-download' },
        { key: 'compute', label: this.$t('backtest-center.tip.computing'), icon: 'calculator' },
        { key: 'analyze', label: this.$t('backtest-center.tip.analyzing'), icon: 'bar-chart' }
      ]
      const sec = this.elapsedSec
      const activeIdx = sec < 4 ? 0 : sec < 10 ? 1 : 2

      return h('div', { class: 'running-overlay' }, [
        h('div', { class: 'running-content' }, [
          h('div', { class: 'running-spinner' }, [
            h('div', { class: 'spinner-track' }),
            h('div', { class: 'spinner-fill' })
          ]),

          h('div', { class: 'running-title' }, this.$t('backtest-center.running')),
          h('div', { class: 'running-elapsed' }, this.fmtElapsed(sec)),

          h('div', { class: 'running-steps' }, steps.map((s, idx) =>
            h('div', { class: ['step-item', idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : ''] }, [
              h('div', { class: 'step-icon' }, [
                idx < activeIdx
                  ? h('a-icon', { props: { type: 'check-circle', theme: 'filled' } })
                  : h('a-icon', { props: { type: s.icon } })
              ]),
              h('span', { class: 'step-label' }, s.label)
            ])
          ))
        ])
      ])
    }

    if (!this.hasResult) {
      return h('div', { class: 'empty-result' }, [
        h('div', { class: 'empty-icon' }, [
          h('a-icon', {
            props: { type: 'bar-chart' },
            style: { color: dk ? '#177ddc' : '#1890ff' }
          })
        ]),
        h('h3', this.$t('backtest-center.emptyTitle')),
        h('p', this.$t('backtest-center.emptyDesc'))
      ])
    }

    const r = this.result || {}
    const metricCards = [
      { label: 'totalReturn', value: this.fmtPct(r.totalReturn), cls: (r.totalReturn || 0) >= 0 ? 'positive' : 'negative', sub: this.fmtMoney(r.totalProfit) },
      { label: 'annualReturn', value: this.fmtPct(r.annualReturn), cls: (r.annualReturn || 0) >= 0 ? 'positive' : 'negative' },
      { label: 'maxDrawdown', value: this.fmtPct(r.maxDrawdown), cls: 'negative' },
      { label: 'sharpe', value: (r.sharpeRatio || 0).toFixed(2), cls: (r.sharpeRatio || 0) >= 1 ? 'positive' : (r.sharpeRatio || 0) < 0 ? 'negative' : '' },
      { label: 'winRate', value: this.fmtPct(r.winRate), cls: (r.winRate || 0) >= 50 ? 'positive' : '' },
      { label: 'profitFactor', value: (r.profitFactor || 0).toFixed(2), cls: (r.profitFactor || 0) >= 1.5 ? 'positive' : (r.profitFactor || 0) < 1 ? 'negative' : '' },
      { label: 'trades', value: String(r.totalTrades || 0), cls: '' },
      { label: 'commission', value: this.fmtMoney(-(r.totalCommission || 0)), cls: '' }
    ]

    return h('div', { class: 'result-content' }, [
      h('div', { class: 'result-header' }, [
        h('div', { class: 'result-header-left' }, [
          h('span', { class: 'result-tag' }, [
            h('a-tag', { props: { color: 'blue' } }, this.symbol),
            h('a-tag', {}, this.market),
            h('a-tag', {}, this.timeframe)
          ]),
          this.backtestRunId ? h('span', { class: 'run-id' }, 'Run #' + this.backtestRunId) : null
        ]),
        h('div', { class: 'result-header-actions' }, [
          h('a-button', {
            props: {
              type: 'primary',
              ghost: true,
              size: 'small',
              loading: this.aiAnalyzing,
              disabled: !this.backtestRunId
            },
            on: { click: this.handleAIAnalyze }
          }, [
            h('a-icon', {
              props: { type: 'bulb' },
              style: { color: dk ? '#177ddc' : undefined }
            }),
            this.$t('dashboard.indicator.backtest.historyAISuggest')
          ])
        ])
      ]),

      h('div', { class: 'metrics-cards' }, metricCards.map(m =>
        h('div', { class: ['metric-card', m.cls] }, [
          h('div', { class: 'metric-label' }, this.$t('backtest-center.result.' + m.label)),
          h('div', { class: 'metric-value' }, m.value),
          m.sub ? h('div', { class: 'metric-sub' }, m.sub) : null
        ])
      )),

      h('div', { class: 'chart-section' }, [
        h('div', { class: 'chart-title' }, [
          h('a-icon', {
            props: { type: 'area-chart' },
            style: {
              marginRight: '6px',
              color: dk ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.45)'
            }
          }),
          this.$t('backtest-center.result.equityCurve')
        ]),
        h('div', { ref: 'eqChart', class: 'equity-chart' })
      ]),

      h('div', { class: 'trades-section' }, [
        h('div', { class: 'chart-title' }, [
          h('a-icon', {
            props: { type: 'swap' },
            style: {
              marginRight: '6px',
              color: dk ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.45)'
            }
          }),
          this.$t('backtest-center.result.tradeHistory'),
          h('span', {
            style: {
              fontWeight: 400,
              fontSize: '12px',
              marginLeft: '8px',
              color: dk ? 'rgba(255,255,255,0.45)' : '#999'
            }
          }, `(${this.pairedTrades.length})`)
        ]),
        h('a-table', {
          props: {
            columns: this.tradeColumns,
            dataSource: this.pairedTrades,
            pagination: { pageSize: 10, size: 'small', showTotal: (t) => `${t} trades` },
            size: 'small',
            scroll: { x: 980 },
            rowKey: 'id'
          },
          scopedSlots: {
            type: (text) => h('a-tag', { props: { color: text === 'long' ? 'green' : 'red' }, style: 'margin:0' }, text === 'long' ? 'LONG' : 'SHORT'),
            openAction: (text) => h('a-tag', { props: { color: text === 'openLong' ? 'green' : 'red' }, style: 'margin:0' }, this.$t('backtest-center.result.' + text)),
            closeReason: (text) => h('a-tag', { props: { color: this.reasonColor(text) }, style: 'margin:0' }, this.$t('backtest-center.result.' + text)),
            price: (text) => h('span', { style: 'font-variant-numeric: tabular-nums' }, this.fmtPrice(text)),
            profit: (text) => h('span', {
              style: {
                color: text > 0 ? '#52c41a' : text < 0 ? '#f5222d' : (dk ? 'rgba(255,255,255,0.65)' : '#666'),
                fontWeight: '600',
                fontVariantNumeric: 'tabular-nums'
              }
            }, this.fmtMoney(text)),
            money: (text) => h('span', {
              style: {
                color: dk ? 'rgba(255,255,255,0.88)' : '#262626',
                fontWeight: '600',
                fontVariantNumeric: 'tabular-nums'
              }
            }, this.fmtMoney(text))
          }
        })
      ]),
      h('a-modal', {
        props: {
          title: this.$t('dashboard.indicator.backtest.historyAISuggestTitle'),
          visible: this.showAIResult,
          footer: null,
          width: 900,
          wrapClassName: this.isDark ? 'bc-modal-wrap bc-modal-wrap--dark' : 'bc-modal-wrap'
        },
        on: {
          cancel: () => { this.showAIResult = false }
        }
      }, [
        this.aiAnalyzing
          ? h('div', { class: 'result-ai-loading' }, [
            h('a-spin', { props: { size: 'large' } }),
            h('div', { class: 'result-ai-loading-text' }, this.$t('dashboard.indicator.backtest.historyAISuggestLoading'))
          ])
          : h('div', { class: 'result-ai-content' }, [
            h('div', { class: 'result-ai-meta-card' }, [
              h('div', { class: 'result-ai-meta-top' }, [
                h('div', { class: 'result-ai-meta-left' }, [
                  h('a-tag', { props: { color: 'blue' } }, this.$t('dashboard.indicator.backtest.historyAISuggest')),
                  h('a-tag', {}, this.aiModeLabel),
                  this.backtestRunId ? h('a-tag', { props: { color: 'purple' } }, `#${this.backtestRunId}`) : null
                ]),
                h('div', { class: 'result-ai-meta-actions' }, [
                  h('a-button', { props: { size: 'small' }, on: { click: this.copyAIResult } }, [
                    h('a-icon', { props: { type: 'copy' } }),
                    this.$t('dashboard.indicator.backtest.historyAICopy')
                  ]),
                  h('a-button', { props: { size: 'small', type: 'primary', ghost: true, disabled: !this.backtestRunId }, on: { click: this.handleAIAnalyze } }, [
                    h('a-icon', { props: { type: 'redo' } }),
                    this.$t('dashboard.indicator.backtest.historyAIRetry')
                  ])
                ])
              ]),
              h('a-alert', {
                style: { marginTop: '12px' },
                props: {
                  type: 'info',
                  showIcon: true,
                  message: this.$t('dashboard.indicator.backtest.historyAIHint')
                }
              })
            ]),
            this.aiResult
              ? h('div', { class: 'result-ai-markdown-card' }, [
                h('div', {
                  class: 'result-ai-markdown-content',
                  domProps: { innerHTML: this.renderedAIHtml }
                })
              ])
              : h('div', { class: 'result-ai-empty' }, this.$t('dashboard.indicator.backtest.historyNoAIResult'))
          ])
      ])
    ])
  }
}

export default {
  name: 'BacktestCenter',
  mixins: [baseMixin],
  components: { BacktestHistoryDrawer, BacktestRunViewer, ResultView },
  data () {
    return {
      activeTab: 'indicator',
      userId: null,
      watchlist: [],
      loadingWatchlist: false,
      // add symbol modal
      showAddModal: false,
      addingStock: false,
      addMarketTab: 'Crypto',
      addSearchKeyword: '',
      addSearchResults: [],
      addSearching: false,
      addSelectedItem: null,
      addSearched: false,
      addSearchTimer: null,
      addTriggerSource: '', // 'indicator' or 'strategy'
      // indicators
      indicators: [],
      loadingIndicators: false,
      selectedIndicatorId: undefined,
      // indicator backtest config
      selectedWatchlistKey: undefined,
      market: 'Crypto',
      symbol: '',
      timeframe: '1D',
      startDate: moment().subtract(6, 'months'),
      endDate: moment(),
      datePreset: '6m',
      initialCapital: 10000,
      leverage: 1,
      commission: 0.02,
      slippage: 0,
      tradeDirection: 'long',
      stopLossPct: 0,
      takeProfitPct: 0,
      entryPct: 100,
      trailingEnabled: false,
      trailingStopPct: 0,
      trailingActivationPct: 0,
      // indicator run state
      running: false,
      runTip: '',
      runTimer: null,
      hasResult: false,
      backtestRunId: null,
      result: {},
      // strategies
      strategies: [],
      loadingStrategies: false,
      selectedStrategyId: undefined,
      // strategy backtest config
      stSelectedWatchlistKey: undefined,
      stMarket: 'Crypto',
      stSymbol: '',
      stTimeframe: '1D',
      stStartDate: moment().subtract(6, 'months'),
      stEndDate: moment(),
      stDatePreset: '6m',
      stInitialCapital: 10000,
      stLeverage: 1,
      stCommission: 0.02,
      stSlippage: 0,
      // strategy run state
      stRunning: false,
      stRunTip: '',
      stRunTimer: null,
      stHasResult: false,
      stBacktestRunId: null,
      stResult: {},
      // history
      showHistoryDrawer: false,
      historyIndicatorId: null,
      historyStrategyId: null,
      historyRunType: '',
      showRunViewer: false,
      selectedRun: null
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    selectedIndicatorObj () {
      return this.selectedIndicatorId ? this.indicators.find(i => i.id === this.selectedIndicatorId) : null
    },
    selectedStrategyObj () {
      return this.selectedStrategyId ? this.strategies.find(s => s.id === this.selectedStrategyId) : null
    },
    canRunIndicator () {
      return this.selectedIndicatorId && this.symbol && this.startDate && this.endDate
    },
    canRunStrategy () {
      return this.selectedStrategyId && this.stSymbol && this.stStartDate && this.stEndDate
    },
    tfMaxDays () { return TF_MAX_DAYS[this.timeframe] || 3650 },
    stTfMaxDays () { return TF_MAX_DAYS[this.stTimeframe] || 3650 },
    tfLimitHint () {
      const d = this.tfMaxDays
      if (d <= 30) return `(≤ 1${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 180) return `(≤ 6${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 365) return `(≤ 1${this.$t('backtest-center.config.yearUnit')})`
      if (d <= 730) return `(≤ 2${this.$t('backtest-center.config.yearUnit')})`
      return `(≤ ${Math.round(d / 365)}${this.$t('backtest-center.config.yearUnit')})`
    },
    stTfLimitHint () {
      const d = this.stTfMaxDays
      if (d <= 30) return `(≤ 1${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 180) return `(≤ 6${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 365) return `(≤ 1${this.$t('backtest-center.config.yearUnit')})`
      if (d <= 730) return `(≤ 2${this.$t('backtest-center.config.yearUnit')})`
      return `(≤ ${Math.round(d / 365)}${this.$t('backtest-center.config.yearUnit')})`
    },
    filteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.tfMaxDays)
    },
    stFilteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.stTfMaxDays)
    }
  },
  async created () {
    await this.loadUserId()
    this.loadIndicators()
    this.loadStrategies()
    this.loadWatchlistData()
    this.parseQuery()
  },
  beforeDestroy () {
    clearInterval(this.runTimer)
    clearInterval(this.stRunTimer)
    clearTimeout(this.addSearchTimer)
  },
  methods: {
    // ===== Data loading =====
    async loadUserId () {
      try {
        const res = await getUserInfo()
        if (res && res.data) this.userId = res.data.id || res.data.user_id || 1
      } catch { this.userId = 1 }
    },
    async loadIndicators () {
      if (!this.userId) return
      this.loadingIndicators = true
      try {
        const res = await request({ url: '/api/indicator/getIndicators', method: 'get', params: { userid: this.userId } })
        if (res && res.data && Array.isArray(res.data)) {
          this.indicators = res.data.map(item => ({ ...item, type: 'python' }))
        }
      } catch (e) { console.warn('Load indicators failed:', e) } finally { this.loadingIndicators = false }
    },
    async loadStrategies () {
      this.loadingStrategies = true
      try {
        const res = await getStrategyList()
        const rows = Array.isArray(res?.data?.strategies) ? res.data.strategies : []
        this.strategies = rows
        if (this.selectedStrategyId) this.$nextTick(() => this.onStrategyChange())
      } catch (e) {
        console.warn('Load strategies failed:', e)
        this.strategies = []
      } finally {
        this.loadingStrategies = false
      }
    },
    async loadWatchlistData () {
      if (!this.userId) return
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) this.watchlist = res.data
      } catch { /* silent */ } finally { this.loadingWatchlist = false }
    },
    parseQuery () {
      const q = this.$route.query
      if (q.tab === 'strategy') this.activeTab = 'strategy'
      if (q.indicator_id) this.selectedIndicatorId = Number(q.indicator_id) || undefined
      if (q.strategy_id) this.selectedStrategyId = Number(q.strategy_id) || undefined
      if (q.view === 'history') this.$nextTick(() => this.openHistory(this.activeTab))
    },

    // ===== Watchlist symbol selection =====
    filterWatchlistOption (input, option) {
      const val = (option.componentOptions.propsData.value || '').toLowerCase()
      if (val === '__add__') return true
      return val.includes(input.toLowerCase())
    },
    handleWatchlistChange (val) {
      if (val === '__add__') {
        this.addTriggerSource = 'indicator'
        this.showAddModal = true
        this.$nextTick(() => { this.selectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const [m, s] = val.split(':')
        this.market = m
        this.symbol = s
      } else {
        this.market = ''
        this.symbol = ''
      }
    },
    handleStWatchlistChange (val) {
      if (val === '__add__') {
        this.addTriggerSource = 'strategy'
        this.showAddModal = true
        this.$nextTick(() => { this.stSelectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const [m, s] = val.split(':')
        this.stMarket = m
        this.stSymbol = s
      } else {
        this.stMarket = ''
        this.stSymbol = ''
      }
    },
    getMarketColor (m) {
      const colors = { Crypto: 'orange', USStock: 'blue', HKStock: 'red', Forex: 'green', Futures: 'purple', PredictionMarket: 'cyan' }
      return colors[m] || 'default'
    },

    // ===== Add symbol modal =====
    onAddMarketTabChange () {
      this.addSearchKeyword = ''
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
    },
    onAddSearchInput () {
      clearTimeout(this.addSearchTimer)
      if (!this.addSearchKeyword) { this.addSearchResults = []; return }
      this.addSearchTimer = setTimeout(() => this.doAddSearch(), 400)
    },
    async doAddSearch () {
      if (!this.addSearchKeyword) return
      this.addSearching = true
      try {
        const res = await searchSymbols({ market: this.addMarketTab, keyword: this.addSearchKeyword, limit: 20 })
        if (res && res.data && Array.isArray(res.data)) {
          this.addSearchResults = res.data
        } else {
          this.addSearchResults = []
        }
        this.addSearched = true
        if (this.addSearchResults.length === 0) {
          this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
        }
      } catch {
        this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
      } finally { this.addSearching = false }
    },
    async handleAddStock () {
      const item = this.addSelectedItem
      if (!item || !item.symbol) {
        this.$message.warning(this.$t('backtest-center.config.symbolRequired'))
        return
      }
      this.addingStock = true
      try {
        const mkt = item.market || this.addMarketTab
        await addWatchlist({ userid: this.userId, market: mkt, symbol: item.symbol, name: item.name || '' })
        this.$message.success(this.$t('backtest-center.config.addSuccess'))
        await this.loadWatchlistData()
        const key = `${mkt}:${item.symbol}`
        if (this.addTriggerSource === 'strategy') {
          this.stSelectedWatchlistKey = key
          this.stMarket = mkt
          this.stSymbol = item.symbol
        } else {
          this.selectedWatchlistKey = key
          this.market = mkt
          this.symbol = item.symbol
        }
        this.showAddModal = false
      } catch (e) {
        this.$message.error(e.message || 'Failed')
      } finally { this.addingStock = false }
    },

    // ===== Timeframe / date range =====
    onTimeframeChange () {
      this.clampDateRange('indicator')
      this.datePreset = this.matchPreset(this.startDate, this.endDate)
    },
    onStTimeframeChange () {
      this.clampDateRange('strategy')
      this.stDatePreset = this.matchPreset(this.stStartDate, this.stEndDate)
    },
    clampDateRange (tab) {
      const max = tab === 'strategy' ? this.stTfMaxDays : this.tfMaxDays
      const start = tab === 'strategy' ? this.stStartDate : this.startDate
      const end = tab === 'strategy' ? this.stEndDate : this.endDate
      if (!start || !end) return
      const diff = end.diff(start, 'days')
      if (diff > max) {
        const newStart = moment(end).subtract(max, 'days')
        if (tab === 'strategy') this.stStartDate = newStart
        else this.startDate = newStart
      }
    },
    matchPreset (start, end) {
      if (!start || !end) return ''
      const days = end.diff(start, 'days')
      for (const p of DATE_PRESETS) {
        if (Math.abs(days - p.days) < 5) return p.key
      }
      return ''
    },
    applyDatePreset (p) {
      this.datePreset = p.key
      this.startDate = moment().subtract(p.days, 'days')
      this.endDate = moment()
    },
    applyStDatePreset (p) {
      this.stDatePreset = p.key
      this.stStartDate = moment().subtract(p.days, 'days')
      this.stEndDate = moment()
    },
    onIndicatorChange () { this.hasResult = false },
    onStrategyChange () {
      this.stHasResult = false
      const s = this.selectedStrategyObj
      const tc = (s && s.trading_config) || {}
      if (s && (s.symbol || tc.symbol)) {
        const mkt = s.market_category || s.market_type || 'Crypto'
        const sym = s.symbol || tc.symbol
        this.stSelectedWatchlistKey = `${mkt}:${sym}`
        this.stMarket = mkt
        this.stSymbol = sym
        this.stTimeframe = tc.timeframe || s.timeframe || this.stTimeframe
        this.stInitialCapital = tc.initial_capital || s.initial_capital || this.stInitialCapital
        this.stLeverage = tc.leverage || s.leverage || this.stLeverage
        this.stCommission = tc.commission || 0
        this.stSlippage = tc.slippage || 0
      }
    },
    strategyTypeLabel (strategy) {
      if (!strategy) return 'Strategy'
      if (strategy.strategy_type === 'ScriptStrategy' || strategy.strategy_mode === 'script') return 'Script'
      return 'Indicator'
    },
    strategyTypeColor (strategy) {
      if (!strategy) return 'blue'
      return strategy.strategy_type === 'ScriptStrategy' || strategy.strategy_mode === 'script' ? 'purple' : 'blue'
    },
    strategySummaryText (strategy) {
      if (!strategy) return ''
      const tc = strategy.trading_config || {}
      const parts = [
        tc.trade_direction || '-',
        tc.market_type || '-',
        tc.timeframe || strategy.timeframe || '-'
      ]
      return parts.join(' / ')
    },
    goToStrategyEditor (strategy) {
      if (!strategy || !strategy.id) return
      this.$router.push({
        path: '/trading-assistant',
        query: { mode: 'edit', strategy_id: String(strategy.id) }
      })
    },

    // ===== Run indicator backtest =====
    async runIndicatorBacktest () {
      if (!this.canRunIndicator) return
      this.running = true
      this.hasResult = false
      this.runTip = ''
      let sec = 0
      this.runTimer = setInterval(() => {
        sec++
        const tips = [this.$t('backtest-center.tip.fetching'), this.$t('backtest-center.tip.computing'), this.$t('backtest-center.tip.analyzing')]
        this.runTip = tips[Math.min(Math.floor(sec / 5), tips.length - 1)]
      }, 1000)
      try {
        const pct = v => Number(v || 0) / 100
        const response = await request({
          url: '/api/indicator/backtest',
          method: 'post',
          data: {
            userid: this.userId || 1,
            indicatorId: this.selectedIndicatorId,
            symbol: this.symbol,
            market: this.market,
            timeframe: this.timeframe,
            startDate: this.startDate.format('YYYY-MM-DD'),
            endDate: this.endDate.format('YYYY-MM-DD'),
            initialCapital: this.initialCapital,
            commission: pct(this.commission),
            slippage: pct(this.slippage),
            leverage: this.leverage,
            tradeDirection: this.tradeDirection,
            strategyConfig: {
              risk: { stopLossPct: pct(this.stopLossPct), takeProfitPct: pct(this.takeProfitPct), trailing: { enabled: this.trailingEnabled, pct: pct(this.trailingStopPct), activationPct: pct(this.trailingActivationPct) } },
              position: { entryPct: pct(this.entryPct) },
              scale: { trendAdd: { enabled: false }, dcaAdd: { enabled: false }, trendReduce: { enabled: false }, adverseReduce: { enabled: false } }
            },
            enableMtf: this.market && this.market.toLowerCase() === 'crypto'
          },
          timeout: 600000
        })
        if (response.code === 1 && response.data) {
          if (response.data.runId) this.backtestRunId = response.data.runId
          this.result = response.data.result || response.data
          this.hasResult = true
          this.$message.success(this.$t('backtest-center.result.success'))
        } else {
          this.$message.error(response.msg || this.$t('backtest-center.result.failed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('backtest-center.result.failed'))
      } finally {
        this.running = false
        clearInterval(this.runTimer)
        this.runTip = ''
      }
    },

    // ===== Run strategy backtest =====
    async runStrategyBacktest () {
      if (!this.canRunStrategy) return
      const s = this.selectedStrategyObj
      if (!s) return
      this.stRunning = true
      this.stHasResult = false
      this.stRunTip = ''
      let sec = 0
      this.stRunTimer = setInterval(() => {
        sec++
        const tips = [this.$t('backtest-center.tip.fetching'), this.$t('backtest-center.tip.computing'), this.$t('backtest-center.tip.analyzing')]
        this.stRunTip = tips[Math.min(Math.floor(sec / 5), tips.length - 1)]
      }, 1000)
      try {
        const response = await runStrategyBacktestApi({
          strategyId: this.selectedStrategyId,
          startDate: this.stStartDate.format('YYYY-MM-DD'),
          endDate: this.stEndDate.format('YYYY-MM-DD'),
          overrideConfig: {
            market: this.stMarket,
            symbol: this.stSymbol,
            timeframe: this.stTimeframe,
            initialCapital: this.stInitialCapital,
            commission: this.stCommission,
            slippage: this.stSlippage,
            leverage: this.stLeverage,
            enableMtf: this.stMarket && this.stMarket.toLowerCase() === 'crypto'
          },
          timeout: 600000
        })
        if (response.code === 1 && response.data) {
          if (response.data.runId) this.stBacktestRunId = response.data.runId
          this.stResult = response.data.result || response.data
          this.stHasResult = true
          this.$message.success(this.$t('backtest-center.result.success'))
        } else {
          this.$message.error(response.msg || this.$t('backtest-center.result.failed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('backtest-center.result.failed'))
      } finally {
        this.stRunning = false
        clearInterval(this.stRunTimer)
        this.stRunTip = ''
      }
    },

    // ===== History =====
    openHistory (tab) {
      if (tab === 'strategy') {
        this.historyIndicatorId = null
        this.historyStrategyId = this.selectedStrategyId || null
        this.historyRunType = 'strategy'
      } else {
        this.historyIndicatorId = this.selectedIndicatorId || null
        this.historyStrategyId = null
        this.historyRunType = ''
      }
      this.showHistoryDrawer = true
    },
    handleViewRun (run) {
      this.selectedRun = run
      this.showRunViewer = true
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;
.backtest-center {
  padding: 20px;
  min-height: calc(100vh - 120px);
}
.page-header {
  margin-bottom: 16px;
  .page-title {
    font-size: 22px; font-weight: 700; margin: 0 0 2px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    display: flex; align-items: center; gap: 10px;
    .title-icon { font-size: 24px; -webkit-text-fill-color: @primary-color; }
  }
  .page-subtitle { margin: 0; font-size: 13px; color: #8c8c8c; }
}
.main-tabs {
  /deep/ .ant-tabs-bar { margin-bottom: 14px; border-bottom: 2px solid #f0f0f0; }
  /deep/ .ant-tabs-tab { font-size: 15px; font-weight: 500; padding: 10px 20px; }
}

// ===== Config Panel =====
.config-col .config-panel {
  background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
  border-radius: 16px; padding: 18px;
  border: 1px solid #eef2f7;
  box-shadow: 0 10px 30px rgba(31, 41, 55, 0.08);
  max-height: calc(100vh - 200px); overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }
}
.section {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #f0f3f8;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
  .section-title {
    font-size: 12px; font-weight: 700; color: #445066; margin-bottom: 10px;
    text-transform: uppercase; letter-spacing: 0.6px;
    display: flex; align-items: center; gap: 6px;
    .hint { font-weight: 400; color: #bfbfbf; font-size: 11px; text-transform: none; }
  }
}
.field-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 500; }
.tf-group {
  display: flex; flex-wrap: wrap;
  /deep/ .ant-radio-button-wrapper { flex: 1; text-align: center; min-width: 36px; padding: 0 6px; }
}
.date-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.run-section { margin-top: 14px; padding-top: 14px; border-top: 1px dashed #e5e7eb; }
.strategy-info { margin-top: 6px; }
.strategy-summary-card {
  margin-top: 10px;
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f7fbff 0%, #f5f7fa 100%);
  border: 1px solid #e6f4ff;
}
.strategy-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.strategy-summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}
.strategy-summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.strategy-summary-text {
  margin-top: 8px;
  font-size: 12px;
  color: #595959;
  line-height: 1.6;
}

// ===== Result Panel =====
.result-col .result-panel {
  background: #fff; border-radius: 12px; padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06); min-height: 500px;
}
/deep/ .empty-result {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 450px;
  .empty-icon {
    width: 100px; height: 100px; border-radius: 50%;
    background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 24px; font-size: 42px; color: #1890ff;
  }
  h3 { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 8px; }
  p { font-size: 14px; color: #8c8c8c; max-width: 320px; text-align: center; line-height: 1.6; }
}
/deep/ .running-overlay {
  display: flex; align-items: center; justify-content: center; min-height: 450px;
  .running-content { text-align: center; width: 280px; }
}
/deep/ .running-spinner {
  width: 64px; height: 64px; margin: 0 auto 20px; position: relative;
  .spinner-track {
    position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid #f0f0f0;
  }
  .spinner-fill {
    position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid transparent; border-top-color: @primary-color;
    animation: spin 1s linear infinite;
  }
}
@keyframes spin { to { transform: rotate(360deg); } }
/deep/ .running-title {
  font-size: 17px; font-weight: 700; color: #333; margin-bottom: 4px;
}
/deep/ .running-elapsed {
  font-size: 24px; font-weight: 300; color: @primary-color; margin-bottom: 24px;
  font-variant-numeric: tabular-nums; letter-spacing: 1px;
}
/deep/ .running-steps {
  display: flex; flex-direction: column; gap: 12px; text-align: left;
  .step-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px; border-radius: 8px;
    background: #fafafa; border: 1px solid #f0f0f0;
    transition: all 0.3s;
    .step-icon { font-size: 16px; color: #d9d9d9; flex-shrink: 0; }
    .step-label { font-size: 13px; color: #999; }
    &.active {
      background: #e6f7ff; border-color: #91d5ff;
      .step-icon { color: @primary-color; animation: pulseIcon 1.2s ease-in-out infinite; }
      .step-label { color: @primary-color; font-weight: 600; }
    }
    &.done {
      background: #f6ffed; border-color: #b7eb8f;
      .step-icon { color: #52c41a; }
      .step-label { color: #52c41a; }
    }
  }
}
@keyframes pulseIcon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
/deep/ .result-content { padding: 0; }
/deep/ .result-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
  .result-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .result-header-actions { display: flex; align-items: center; gap: 8px; }
  .result-tag { display: flex; gap: 4px; flex-wrap: wrap; }
  .run-id { font-size: 12px; color: #999; font-variant-numeric: tabular-nums; }
}
/deep/ .metrics-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px;
}
/deep/ .metric-card {
  background: #fafafa; border-radius: 10px; padding: 14px 12px; text-align: center; border: 1px solid #f0f0f0;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .metric-label { font-size: 11px; color: #8c8c8c; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; color: #333; line-height: 1.2; }
  .metric-sub { font-size: 11px; color: #8c8c8c; margin-top: 4px; font-variant-numeric: tabular-nums; }
  &.positive .metric-value { color: #52c41a; }
  &.negative .metric-value { color: #f5222d; }
}
/deep/ .chart-section {
  margin-bottom: 24px;
  .chart-title {
    font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;
    display: flex; align-items: center;
  }
  .equity-chart { width: 100%; height: 300px; border-radius: 8px; }
}
/deep/ .trades-section .chart-title {
  font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;
  display: flex; align-items: center;
}
/deep/ .result-ai-loading {
  padding: 26px 0;
  text-align: center;
}
/deep/ .result-ai-loading-text {
  margin-top: 12px;
  color: #8c8c8c;
}
/deep/ .result-ai-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
/deep/ .result-ai-meta-card {
  border: 1px solid #edf2f7;
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(180deg, #fbfdff 0%, #f7faff 100%);
}
/deep/ .result-ai-meta-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
/deep/ .result-ai-meta-left,
/deep/ .result-ai-meta-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
/deep/ .result-ai-markdown-card {
  border: 1px solid #eef2f7;
  border-radius: 12px;
  padding: 18px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}
/deep/ .result-ai-markdown-content {
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
  /deep/ p { margin: 0 0 12px; color: #434343; }
  /deep/ ul,
  /deep/ ol { margin: 0 0 14px 20px; padding: 0; }
  /deep/ li { margin-bottom: 8px; color: #434343; }
  /deep/ strong { color: #262626; font-weight: 700; }
  /deep/ em { color: #595959; }
  /deep/ code {
    padding: 1px 6px;
    border-radius: 6px;
    background: #f5f5f5;
    color: #cf1322;
    font-size: 13px;
  }
  /deep/ pre {
    margin: 0 0 14px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #141414;
    overflow-x: auto;
  }
  /deep/ pre code {
    padding: 0;
    background: transparent;
    color: rgba(255,255,255,0.88);
  }
  /deep/ blockquote {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-left: 3px solid #91d5ff;
    background: #f5fbff;
    color: #595959;
  }
}
/deep/ .result-ai-empty {
  padding: 20px 0 8px;
  text-align: center;
  color: #8c8c8c;
}

// add symbol modal
.add-item-active { background: #e6f7ff !important; }

// ===== Dark Theme =====
  &.theme-dark {
    background: #141414;

    .page-header {
      .page-title {
        background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        .title-icon {
          -webkit-text-fill-color: unset;
          color: #40a9ff !important;
          background: none;
          -webkit-background-clip: unset;
          background-clip: unset;
        }
      }
      .page-subtitle { color: rgba(255,255,255,0.45); }
    }

  .main-tabs {
    /deep/ .ant-tabs-bar { border-bottom-color: #303030; }
    /deep/ .ant-tabs-tab { color: rgba(255,255,255,0.65); &:hover { color: #fff; } }
    /deep/ .ant-tabs-tab-active { color: #177ddc !important; }
    /deep/ .ant-tabs-ink-bar { background: #177ddc; }
  }

  .config-panel {
    background: linear-gradient(180deg, #1f1f1f 0%, #191919 100%);
    border-color: #2f3540;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    &::-webkit-scrollbar-thumb { background: #434343; }
  }
  .section {
    background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%);
    border-color: #2d323b;
  }
  .section .section-title { color: rgba(255,255,255,0.78); .hint { color: rgba(255,255,255,0.35); } }
  .field-label { color: rgba(255,255,255,0.58); }

  /deep/ .ant-select .ant-select-selection {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.85);
    .ant-select-arrow { color: rgba(255,255,255,0.45); }
    &:hover { border-color: #177ddc; }
  }
  /deep/ .ant-select-selection__placeholder { color: rgba(255,255,255,0.35); }
  /deep/ .ant-input, /deep/ .ant-input-number {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.85);
    &:focus, &:hover { border-color: #177ddc; }
  }
  /deep/ .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  /deep/ .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: #177ddc; } }
  /deep/ .ant-calendar-picker-input { background: #141414; border-color: #434343; color: rgba(255,255,255,0.85); }
  /deep/ .ant-calendar-picker-icon { color: rgba(255,255,255,0.45); }
  /deep/ .ant-radio-button-wrapper {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { color: #177ddc; }
    &.ant-radio-button-wrapper-checked { background: #177ddc; border-color: #177ddc; color: #fff; }
  }
  /deep/ .ant-checkbox-wrapper { color: rgba(255,255,255,0.85); }
  /deep/ .ant-checkbox-inner { background: #141414; border-color: #434343; }
  /deep/ .ant-btn-default {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { border-color: #177ddc; color: #177ddc; }
  }
  .run-section { border-top-color: #303030; }
  .strategy-summary-card {
    background: linear-gradient(180deg, rgba(23,125,220,0.12) 0%, rgba(255,255,255,0.03) 100%);
    border-color: rgba(23,125,220,0.22);
  }
  .strategy-summary-title { color: rgba(255,255,255,0.92); }
  .strategy-summary-text { color: rgba(255,255,255,0.65); }

  .result-panel {
    background: #1f1f1f;
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  }

  /deep/ .running-spinner {
    .spinner-track { border-color: #303030; }
    .spinner-fill { border-top-color: #177ddc; }
  }
  /deep/ .running-title { color: rgba(255,255,255,0.85); }
  /deep/ .running-elapsed { color: #177ddc; }
  /deep/ .running-steps .step-item {
    background: #141414; border-color: #303030;
    .step-icon { color: rgba(255,255,255,0.38); }
    .step-label { color: rgba(255,255,255,0.35); }
    &.active {
      background: rgba(23,125,220,0.1); border-color: rgba(23,125,220,0.3);
      .step-icon { color: #177ddc; }
      .step-label { color: #177ddc; }
    }
    &.done {
      background: rgba(73,170,25,0.08); border-color: rgba(73,170,25,0.25);
      .step-icon { color: #49aa19; }
      .step-label { color: #49aa19; }
    }
  }
  /deep/ .running-steps .step-item .step-icon .anticon {
    color: inherit !important;
  }

  /deep/ .result-header-actions {
    .ant-btn.ant-btn-primary.ant-btn-background-ghost .anticon {
      color: #177ddc;
    }
  }

  /deep/ .empty-result {
    .empty-icon {
      background: linear-gradient(135deg, rgba(23,125,220,0.15) 0%, rgba(23,125,220,0.08) 100%);
      color: #177ddc;
    }
    h3 { color: rgba(255,255,255,0.85); }
    p { color: rgba(255,255,255,0.45); }
  }

  /deep/ .result-header .run-id { color: rgba(255,255,255,0.45); }
  /deep/ .result-ai-loading-text { color: rgba(255,255,255,0.45); }
  /deep/ .result-ai-meta-card {
    background: linear-gradient(180deg, rgba(23,125,220,0.08) 0%, rgba(255,255,255,0.02) 100%);
    border-color: rgba(23,125,220,0.22);
  }
  /deep/ .result-ai-markdown-card {
    background: linear-gradient(180deg, #171717 0%, #141414 100%);
    border-color: #2f3540;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  }
  /deep/ .result-ai-markdown-content {
    color: rgba(255,255,255,0.82);
    /deep/ h1,
    /deep/ h2,
    /deep/ h3 { color: rgba(255,255,255,0.92); }
    /deep/ p,
    /deep/ li { color: rgba(255,255,255,0.72); }
    /deep/ strong { color: rgba(255,255,255,0.92); }
    /deep/ em { color: rgba(255,255,255,0.62); }
    /deep/ code {
      background: rgba(255,255,255,0.08);
      color: #ff9c6e;
    }
    /deep/ blockquote {
      background: rgba(23,125,220,0.08);
      color: rgba(255,255,255,0.68);
      border-left-color: rgba(23,125,220,0.45);
    }
  }
  /deep/ .result-ai-empty { color: rgba(255,255,255,0.45); }

  /deep/ .metric-card {
    background: #141414; border-color: #303030;
    &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .metric-label { color: rgba(255,255,255,0.45); }
    .metric-value { color: rgba(255,255,255,0.85); }
    .metric-sub { color: rgba(255,255,255,0.35); }
    &.positive .metric-value { color: #49aa19; }
    &.negative .metric-value { color: #d32029; }
  }

  /deep/ .chart-section .chart-title, /deep/ .trades-section .chart-title { color: rgba(255,255,255,0.85); }

  /deep/ .ant-table {
    background: transparent; color: rgba(255,255,255,0.85);
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border-bottom-color: #303030; }
    .ant-table-tbody > tr > td { border-bottom-color: #303030; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.04); }
    .ant-table-placeholder { background: transparent; color: rgba(255,255,255,0.35); }
  }
  /deep/ .ant-pagination {
    .ant-pagination-item { background: #1f1f1f; border-color: #434343; a { color: rgba(255,255,255,0.65); } &.ant-pagination-item-active { border-color: #177ddc; a { color: #177ddc; } } }
    .ant-pagination-prev, .ant-pagination-next { .ant-pagination-item-link { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.45); } }
  }
  /deep/ .ant-empty-description { color: rgba(255,255,255,0.35); }
  /deep/ .ant-empty-image svg { fill: rgba(255,255,255,0.1); }

  /deep/ .empty-icon .anticon {
    color: #177ddc !important;
  }
}
</style>

<style lang="less">
/* Modal is mounted on body — unscoped */
.bc-modal-wrap--dark {
  .ant-modal-content {
    background: #1f1f1f;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
  }
  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }
  .ant-modal-title {
    color: rgba(255, 255, 255, 0.88);
  }
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);
    &:hover {
      color: rgba(255, 255, 255, 0.88);
    }
  }
  .ant-modal-body {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
  }
  .ant-modal-footer {
    background: #1f1f1f;
    border-top-color: #303030;
  }
  .ant-tabs-bar {
    border-bottom-color: #303030;
  }
  .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.55);
    &:hover {
      color: rgba(255, 255, 255, 0.85);
    }
  }
  .ant-tabs-tab-active {
    color: #177ddc !important;
  }
  .ant-input-search .ant-input {
    background: #141414;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.88);
    &:hover,
    &:focus {
      border-color: #177ddc;
    }
  }
  .ant-input-search-icon {
    color: rgba(255, 255, 255, 0.45);
  }
  .ant-list-item {
    color: rgba(255, 255, 255, 0.85);
    border-bottom-color: #303030;
  }
  .ant-list-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}
</style>
