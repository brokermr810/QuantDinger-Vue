<template>
  <div class="chart-left" :class="{ 'theme-dark': chartTheme === 'dark' }">
    <div class="chart-wrapper">
      <!-- 画线工具工具栏 -->
      <div class="drawing-toolbar">
        <a-tooltip
          v-for="tool in drawingTools"
          :key="tool.name"
          :title="tool.title"
          placement="right"
        >
          <div
            class="drawing-tool-btn"
            :class="{ active: activeDrawingTool === tool.name }"
            @click="selectDrawingTool(tool.name)"
          >
            <a-icon :type="tool.icon" />
          </div>
        </a-tooltip>
        <a-divider type="vertical" />
        <a-tooltip :title="$t('dashboard.indicator.drawing.clearAll')" placement="right">
          <div class="drawing-tool-btn" @click="clearAllDrawings">
            <a-icon type="delete" />
          </div>
        </a-tooltip>
      </div>
      <!-- 图表内容区域 -->
      <div class="chart-content-area">
        <!-- 指标工具栏 -->
        <div class="indicator-toolbar">
          <div
            v-for="indicator in indicatorButtons"
            :key="indicator.id"
            class="indicator-btn"
            :class="{ active: isIndicatorActive(indicator.id) }"
            @click="handleIndicatorButtonClick(indicator)"
            :title="indicator.name"
          >
            {{ indicator.shortName }}
          </div>
        </div>
        <div v-if="activePresetIndicators.length" class="indicator-active-bar">
          <div
            v-for="indicator in activePresetIndicators"
            :key="indicator.instanceId || indicator.id"
            class="indicator-active-chip"
            :class="{ 'indicator-active-chip--hidden': indicator.visible === false }"
          >
            <span class="indicator-active-chip__label" @click="openIndicatorEditor(indicator)">
              {{ formatIndicatorInstanceLabel(indicator) }}
            </span>
            <a-tooltip :title="indicator.visible === false ? $t('indicatorIde.editor.showIndicator') : $t('indicatorIde.editor.hideIndicator')">
              <a-icon
                :type="indicator.visible === false ? 'eye-invisible' : 'eye'"
                class="indicator-active-chip__action"
                @click.stop="toggleIndicatorVisibility(indicator)"
              />
            </a-tooltip>
            <a-tooltip :title="$t('indicatorIde.editor.settings')">
              <a-icon
                type="setting"
                class="indicator-active-chip__action"
                @click.stop="openIndicatorEditor(indicator)"
              />
            </a-tooltip>
            <a-tooltip :title="$t('indicatorIde.editor.deleteIndicator')">
              <a-icon
                type="close"
                class="indicator-active-chip__action"
                @click.stop="removeIndicatorInstance(indicator)"
              />
            </a-tooltip>
          </div>
        </div>
        <div
          id="kline-chart-container"
          class="kline-chart-container"
        ></div>
        <canvas
          ref="wmCanvasRef"
          class="qd-wm-layer"
          :class="{ 'qd-wm-layer--dark': chartTheme === 'dark' }"
        ></canvas>
      </div>

      <div v-if="loading" class="chart-overlay">
        <a-spin size="large">
          <a-icon slot="indicator" type="loading" style="font-size: 24px; color: #13c2c2" spin />
        </a-spin>
      </div>

      <div v-if="error" class="chart-overlay">
        <div class="error-box">
          <a-icon type="warning" style="font-size: 24px; color: #ef5350; margin-bottom: 10px" />
          <span>{{ error }}</span>
          <a-button type="primary" size="small" ghost @click="handleRetry" style="margin-top: 12px">
            {{ $t('dashboard.indicator.retry') }}
          </a-button>
        </div>
      </div>

      <!-- Pyodide 加载失败提示 -->
      <div v-if="pyodideLoadFailed" class="chart-overlay pyodide-warning">
        <div class="warning-box">
          <a-icon type="warning" style="font-size: 32px; color: #faad14; margin-bottom: 12px" />
          <div class="warning-title">{{ $t('dashboard.indicator.warning.pyodideLoadFailed') }}</div>
          <div class="warning-desc">{{ $t('dashboard.indicator.warning.pyodideLoadFailedDesc') }}</div>
        </div>
      </div>

      <!-- 初始提示蒙版 -->
      <div v-if="!symbol && !loading && !error && !pyodideLoadFailed" class="chart-overlay initial-hint">
        <div class="hint-box">
          <a-icon type="line-chart" style="font-size: 48px; color: #1890ff; margin-bottom: 16px" />
          <div class="hint-title">{{ $t('dashboard.indicator.hint.selectSymbol') }}</div>
          <div class="hint-desc">{{ $t('dashboard.indicator.hint.selectSymbolDesc') }}</div>
        </div>
      </div>
    </div>
    <a-modal
      :visible="indicatorEditorVisible"
      :title="indicatorEditorTitle"
      :confirmLoading="indicatorEditorSaving"
      :okText="$t('common.confirm')"
      :cancelText="$t('common.cancel')"
      :wrap-class-name="indicatorEditorModalWrapClass"
      @ok="applyIndicatorEditor"
      @cancel="closeIndicatorEditor"
    >
      <div v-if="indicatorEditorSchema.length" class="indicator-editor-form">
        <div
          v-for="field in indicatorEditorSchema"
          :key="field.key"
          class="indicator-editor-field"
        >
          <div class="indicator-editor-field__label">{{ field.label }}</div>
          <a-input-number
            v-model="indicatorEditorForm[field.key]"
            :min="field.min"
            :max="field.max"
            :step="field.step || 1"
            :precision="field.precision != null ? field.precision : 0"
            style="width: 100%"
          />
          <div v-if="field.hint" class="indicator-editor-field__hint">{{ field.hint }}</div>
        </div>
        <div class="indicator-editor-field">
          <div class="indicator-editor-field__label">{{ $t('indicatorIde.editor.color') }}</div>
          <input v-model="indicatorEditorForm._styleColor" type="color" class="indicator-editor-color" />
        </div>
        <div class="indicator-editor-field">
          <div class="indicator-editor-field__label">{{ $t('indicatorIde.editor.lineWidth') }}</div>
          <a-input-number
            v-model="indicatorEditorForm._styleLineWidth"
            :min="1"
            :max="6"
            :step="1"
            :precision="0"
            style="width: 100%"
          />
        </div>
      </div>
      <div v-else class="indicator-editor-empty">{{ $t('indicatorIde.editor.noEditableParams') }}</div>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch, shallowRef, getCurrentInstance } from 'vue'
import { init, registerIndicator, registerOverlay } from 'klinecharts'
import request from '@/utils/request'
import { decryptCodeAuto, needsDecrypt } from '@/utils/codeDecrypt'
import ExchangeKlineWs from '@/utils/exchangeWs'

export default {
  name: 'KlineChart',
  props: {
    symbol: {
      type: String,
      default: ''
    },
    market: {
      type: String,
      default: ''
    },
    timeframe: {
      type: String,
      default: '1H'
    },
    theme: {
      type: String,
      default: 'light'
    },
    activeIndicators: {
      type: Array,
      default: () => []
    },
    realtimeEnabled: {
      type: Boolean,
      default: false
    },
    userId: {
      type: Number,
      default: null
    }
  },
  emits: ['retry', 'price-change', 'load', 'indicator-toggle'],
  setup (props, { emit }) {
    // K线数据
    const klineData = shallowRef([])
    const loading = ref(false)
    const error = ref(null)
    const loadingHistory = ref(false)
    const hasMoreHistory = ref(true)
    // 用于追踪正在进行的加载请求，防止重复请求
    let loadingHistoryPromise = null
    // 标记图表是否已初始化完成，避免初始化时触发加载
    const chartInitialized = ref(false)

    // 图表实例
    const chartRef = shallowRef(null)
    const chartTheme = ref(props.theme || 'light')
    /** 父容器高度变化（如指标 IDE 拖拽分割条）不会触发 window.resize，需 ResizeObserver 调 chart.resize */
    let chartResizeObserver = null
    let chartResizeRafId = null

    const wmCanvasRef = ref(null)
    let _wmTimer = null
    let _wmObserver = null

    // 实时更新设置
    const realtimeTimer = ref(null)
    const realtimeInterval = ref(5000)
    /** 避免实时请求堆叠（上一轮未完成又触发下一轮会加重闪烁） */
    const realtimeFetchInFlight = ref(false)
    let realtimeChartRafId = null
    /** WebSocket 实时推送实例（加密市场直连交易所 WS） */
    let wsClient = null
    const wsActive = ref(false)
    let _cachedExchangeId = null
    let _exchangeIdTs = 0
    let _realtimeGeneration = 0
    /** 价格条节流：避免父组件因 price-change 频繁重绘 */
    const lastPriceEmitSig = ref('')

    /** 当前标的的价格精度（小数位数），根据K线数据自动推算 */
    const pricePrecision = ref(2)

    /**
     * 根据一组K线数据自动推算合理的价格精度。
     * 策略：取 close 价格中有效小数位数最多的那个，再额外 +1 保留余量，
     * 同时确保小范围价差（如 0.15678 vs 0.15701）不被抹平。
     */
    const calcPricePrecision = (data) => {
      if (!data || data.length === 0) return 2

      let maxDecimals = 0
      const sample = data.length > 50 ? data.slice(-50) : data
      for (let i = 0; i < sample.length; i++) {
        const vals = [sample[i].close, sample[i].open, sample[i].high, sample[i].low]
        for (let j = 0; j < vals.length; j++) {
          const s = String(vals[j])
          const dot = s.indexOf('.')
          if (dot >= 0) {
            const dec = s.length - dot - 1
            if (dec > maxDecimals) maxDecimals = dec
          }
        }
      }

      // 另一个视角：最小价差。如果 high-low 相对于价格非常小，需要更多小数位
      let minSpread = Infinity
      for (let i = 0; i < sample.length; i++) {
        const spread = sample[i].high - sample[i].low
        if (spread > 0 && spread < minSpread) minSpread = spread
      }
      let spreadDecimals = 2
      if (minSpread < Infinity && minSpread > 0) {
        // 需要多少位才能区分这个最小价差？至少让它显示为非零
        spreadDecimals = Math.ceil(-Math.log10(minSpread)) + 2
      }

      const result = Math.max(maxDecimals, spreadDecimals, 2)
      return Math.min(result, 10) // 上限 10 位
    }

    /** 用当前精度格式化价格 */
    const formatPrice = (v) => {
      return (Number(v) || 0).toFixed(pricePrecision.value)
    }

    // 指标刷新锁：避免实时定时器触发时 updateIndicators 重入（Python 指标可能较慢）
    const indicatorsUpdating = ref(false)
    // 指标刷新节流：K线/价格可高频刷新，但指标计算可以低频刷新（默认 10s）
    const indicatorRefreshInterval = ref(10000)
    const lastIndicatorRefreshTs = ref(0)

    // K线刷新很频繁时，指标计算不必同步频率；这里做节流（并且有重入锁）。
    const maybeUpdateIndicators = (force = false) => {
      if (!chartRef.value) return
      const now = Date.now()
      const iv = Number(indicatorRefreshInterval.value || 10000)
      if (force || !lastIndicatorRefreshTs.value || (now - lastIndicatorRefreshTs.value) >= iv) {
        lastIndicatorRefreshTs.value = now
        updateIndicators()
      }
    }

    // 已添加的指标 ID 列表（用于清理）
    const addedIndicatorIds = ref([])
    // 已添加的信号 overlay ID 列表（用于清理）
    const addedSignalOverlayIds = ref([])
    // 已添加的画线 overlay ID 列表（用于清理和管理）
    const addedDrawingOverlayIds = ref([])
    // 当前激活的画线工具
    const activeDrawingTool = ref(null)

    // 画线工具定义（使用 computed 实现多语言支持）
    const { proxy } = getCurrentInstance()

    const drawingTools = computed(() => [
      { name: 'line', title: proxy.$t('dashboard.indicator.drawing.line'), icon: 'line' },
      { name: 'horizontalLine', title: proxy.$t('dashboard.indicator.drawing.horizontalLine'), icon: 'minus' },
      { name: 'verticalLine', title: proxy.$t('dashboard.indicator.drawing.verticalLine'), icon: 'column-width' },
      { name: 'ray', title: proxy.$t('dashboard.indicator.drawing.ray'), icon: 'arrow-right' },
      { name: 'straightLine', title: proxy.$t('dashboard.indicator.drawing.straightLine'), icon: 'menu' },
      { name: 'parallelStraightLine', title: proxy.$t('dashboard.indicator.drawing.parallelLine'), icon: 'menu' },
      { name: 'priceLine', title: proxy.$t('dashboard.indicator.drawing.priceLine'), icon: 'dollar' },
      { name: 'priceChannelLine', title: proxy.$t('dashboard.indicator.drawing.priceChannel'), icon: 'border' },
      { name: 'fibonacciLine', title: proxy.$t('dashboard.indicator.drawing.fibonacciLine'), icon: 'rise' }
    ])

    // 指标按钮定义
    const indicatorButtons = ref([
      {
        id: 'sma',
        name: 'SMA (简单移动平均)',
        shortName: 'SMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'ema',
        name: 'EMA (指数移动平均)',
        shortName: 'EMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'rsi',
        name: 'RSI (相对强弱)',
        shortName: 'RSI',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'macd',
        name: 'MACD',
        shortName: 'MACD',
        type: 'macd',
        defaultParams: { fast: 12, slow: 26, signal: 9 },
        paramSchema: [
          { key: 'fast', labelKey: 'indicatorIde.editor.fastLine', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'slow', labelKey: 'indicatorIde.editor.slowLine', type: 'number', min: 2, max: 200, step: 1 },
          { key: 'signal', labelKey: 'indicatorIde.editor.signalLine', type: 'number', min: 1, max: 100, step: 1 }
        ]
      },
      {
        id: 'bb',
        name: '布林带 (Bollinger Bands)',
        shortName: 'BB',
        type: 'band',
        defaultParams: { length: 20, mult: 2 },
        paramSchema: [
          { key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 },
          { key: 'mult', labelKey: 'indicatorIde.editor.multiplier', type: 'number', min: 0.1, max: 10, step: 0.1, precision: 1 }
        ]
      },
      {
        id: 'atr',
        name: 'ATR (平均真实波幅)',
        shortName: 'ATR',
        type: 'line',
        defaultParams: { period: 14 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'cci',
        name: 'CCI (商品通道指数)',
        shortName: 'CCI',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'williams',
        name: 'Williams %R (威廉指标)',
        shortName: 'W%R',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'mfi',
        name: 'MFI (资金流量指标)',
        shortName: 'MFI',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'adx',
        name: 'ADX (平均趋向指数)',
        shortName: 'ADX',
        type: 'adx',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      { id: 'obv', name: 'OBV (能量潮)', shortName: 'OBV', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'adosc',
        name: 'ADOSC (积累/派发振荡器)',
        shortName: 'ADOSC',
        type: 'line',
        defaultParams: { fast: 3, slow: 10 },
        paramSchema: [
          { key: 'fast', labelKey: 'indicatorIde.editor.fastLine', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'slow', labelKey: 'indicatorIde.editor.slowLine', type: 'number', min: 2, max: 200, step: 1 }
        ]
      },
      { id: 'ad', name: 'AD (积累/派发线)', shortName: 'AD', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'kdj',
        name: 'KDJ (随机指标)',
        shortName: 'KDJ',
        type: 'line',
        defaultParams: { period: 9, k: 3, d: 3 },
        paramSchema: [
          { key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'k', labelKey: 'indicatorIde.editor.kSmoothing', type: 'number', min: 1, max: 20, step: 1 },
          { key: 'd', labelKey: 'indicatorIde.editor.dSmoothing', type: 'number', min: 1, max: 20, step: 1 }
        ]
      }
    ])

    const getIndicatorTemplate = (indicatorId) => {
      return indicatorButtons.value.find(item => item.id === indicatorId) || null
    }

    const normalizeIndicatorParams = (template, rawParams = {}) => {
      const params = { ...(template?.defaultParams || {}) }
      const schema = (template && Array.isArray(template.paramSchema)) ? template.paramSchema : []
      schema.forEach(field => {
        const rawValue = rawParams[field.key]
        const fallback = params[field.key]
        let nextValue = rawValue != null && rawValue !== '' ? Number(rawValue) : fallback
        if (Number.isNaN(nextValue)) nextValue = fallback
        if (field.min != null && nextValue < field.min) nextValue = field.min
        if (field.max != null && nextValue > field.max) nextValue = field.max
        if (field.precision != null && typeof nextValue === 'number') {
          nextValue = Number(nextValue.toFixed(field.precision))
        } else if (typeof nextValue === 'number' && Number.isInteger(field.step || 1)) {
          nextValue = Math.round(nextValue)
        }
        params[field.key] = nextValue
      })
      return params
    }

    const createIndicatorInstanceId = (indicatorId) => {
      return `${indicatorId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const normalizeIndicatorStyle = (style = {}, fallbackColor = '') => {
      const lineWidth = Math.max(1, Math.min(6, parseInt(style.lineWidth, 10) || 2))
      return {
        color: String(style.color || fallbackColor || '').trim() || fallbackColor || '#1890ff',
        lineWidth
      }
    }

    const pickNextDefaultParams = (template, existingIndicators = []) => {
      const baseParams = normalizeIndicatorParams(template, template?.defaultParams || {})
      if (!template || !template.id) return baseParams
      const sameType = (existingIndicators || []).filter(item => item && item.id === template.id)
      if (!sameType.length) return baseParams

      if (template.id === 'ema' || template.id === 'sma') {
        const preferred = [10, 20, 60, 120, 250]
        const used = new Set(sameType.map(item => Number(item?.params?.length || item?.params?.period || 0)).filter(Boolean))
        const candidate = preferred.find(value => !used.has(value))
        if (candidate) {
          return {
            ...baseParams,
            length: candidate
          }
        }
        const maxUsed = Math.max(...Array.from(used))
        return {
          ...baseParams,
          length: maxUsed > 0 ? maxUsed + 10 : (baseParams.length || 20)
        }
      }

      return baseParams
    }

    const formatIndicatorInstanceLabel = (indicator) => {
      if (!indicator) return ''
      const template = getIndicatorTemplate(indicator.id)
      const params = normalizeIndicatorParams(template, indicator.params || {})
      switch (indicator.id) {
        case 'sma':
        case 'ema':
        case 'rsi':
        case 'cci':
        case 'mfi':
        case 'adx':
        case 'williams':
          return `${template ? template.shortName : indicator.id.toUpperCase()}(${params.length})`
        case 'atr':
          return `ATR(${params.period})`
        case 'macd':
          return `MACD(${params.fast}, ${params.slow}, ${params.signal})`
        case 'bb':
          return `BB(${params.length}, ${params.mult})`
        case 'adosc':
          return `ADOSC(${params.fast}, ${params.slow})`
        case 'kdj':
          return `KDJ(${params.period}, ${params.k}, ${params.d})`
        default:
          return template ? template.shortName : indicator.id.toUpperCase()
      }
    }

    const activePresetIndicators = computed(() => {
      return (props.activeIndicators || []).filter(item => item && item.id && item.id !== 'selected-python-indicator' && item.type !== 'python')
    })

    const indicatorEditorVisible = ref(false)
    const indicatorEditorSaving = ref(false)
    const indicatorEditorTargetId = ref('')
    const indicatorEditorForm = reactive({})

    const indicatorEditorTarget = computed(() => {
      return activePresetIndicators.value.find(item => (item.instanceId || item.id) === indicatorEditorTargetId.value) || null
    })

    const indicatorEditorTemplate = computed(() => {
      return indicatorEditorTarget.value ? getIndicatorTemplate(indicatorEditorTarget.value.id) : null
    })

    const indicatorEditorSchema = computed(() => {
      return indicatorEditorTemplate.value && Array.isArray(indicatorEditorTemplate.value.paramSchema)
        ? indicatorEditorTemplate.value.paramSchema.map(field => ({
            ...field,
            label: field.labelKey ? proxy.$t(field.labelKey) : field.label
          }))
        : []
    })

    const indicatorEditorModalWrapClass = computed(() => {
      return chartTheme.value === 'dark' ? 'indicator-editor-modal indicator-editor-modal--dark' : 'indicator-editor-modal'
    })

    const indicatorEditorTitle = computed(() => {
      return indicatorEditorTarget.value
        ? `${proxy.$t('indicatorIde.editor.edit')} ${formatIndicatorInstanceLabel(indicatorEditorTarget.value)}`
        : proxy.$t('indicatorIde.editor.editParams')
    })

    // 检查指标是否激活
    const isIndicatorActive = (indicatorId) => {
      return props.activeIndicators.some(ind => ind.id === indicatorId)
    }

    // 选择画线工具
    const selectDrawingTool = (toolName) => {
      if (!chartRef.value) {
        return
      }

      // 工具名称映射（UI 工具名 -> klinecharts 内部覆盖物名称）
      const toolMap = {
        line: 'segment',
        horizontalLine: 'horizontalStraightLine',
        verticalLine: 'verticalStraightLine',
        ray: 'rayLine',
        straightLine: 'straightLine',
        parallelStraightLine: 'parallelStraightLine',
        priceLine: 'priceLine',
        priceChannelLine: 'priceChannelLine',
        fibonacciLine: 'fibonacciLine',
        measure: 'priceRangeMeasure'
      }

      const overlayName = toolMap[toolName] || toolName

      // 如果点击的是当前激活的工具，则取消激活
      if (activeDrawingTool.value === toolName) {
        activeDrawingTool.value = null
        // 取消当前的绘制模式
        // KLineChart 没有直接的 "cancelDrawing" API，通常移除最后一个未完成的覆盖物
        // 或者通过 overrideOverlay(null) 来取消正在进行的动作（如果支持）
        try {
          if (typeof chartRef.value.overrideOverlay === 'function') {
            chartRef.value.overrideOverlay(null)
          }
        } catch (e) {
        }
        return
      }

      // 激活新的画线工具
      activeDrawingTool.value = toolName

      try {
        // klinecharts v9：overrideOverlay 只更新已存在的覆盖物，不会进入绘制模式。
        // 自定义 priceRangeMeasure 与内置工具一样，用 createOverlay（无 points）即可进入逐步取点绘制。
        const overlayConfig = {
          name: overlayName,
          lock: false,
          extendData: {
            isDrawing: true
          }
        }
        const overlayId = chartRef.value.createOverlay(overlayConfig)
        if (overlayId) {
          addedDrawingOverlayIds.value.push(overlayId)
        } else {
          console.warn(`Failed to create overlay: ${overlayName}. Make sure the overlay is registered.`)
          activeDrawingTool.value = null
        }
      } catch (err) {
        console.error(`Error selecting drawing tool ${toolName} (${overlayName}):`, err)
        activeDrawingTool.value = null
      }
    }

    // 清除所有画线
    const clearAllDrawings = () => {
      if (!chartRef.value) return

      try {
        // 移除所有已添加的画线覆盖物
        addedDrawingOverlayIds.value.forEach(overlayId => {
          try {
            if (typeof chartRef.value.removeOverlay === 'function') {
              chartRef.value.removeOverlay(overlayId)
            } else if (typeof chartRef.value.removeOverlayById === 'function') {
              chartRef.value.removeOverlayById(overlayId)
            }
          } catch (err) {
          }
        })
        addedDrawingOverlayIds.value = []
        activeDrawingTool.value = null

        // 取消当前的绘制模式
        if (typeof chartRef.value.overrideOverlay === 'function') {
          chartRef.value.overrideOverlay(null)
        }
      } catch (err) {
      }
    }

    // 切换指标显示/隐藏
    const toggleIndicator = (indicator) => {
      const isActive = isIndicatorActive(indicator.id)

      if (isActive) {
        // 移除指标
        emit('indicator-toggle', {
          action: 'remove',
          indicator: { id: indicator.id }
        })
      } else {
        // 添加指标
        const indicatorToAdd = {
          ...indicator,
          params: { ...indicator.defaultParams },
          calculate: null // calculate 函数在 updateIndicators 中通过 id 判断
        }
        emit('indicator-toggle', {
          action: 'add',
          indicator: indicatorToAdd
        })
      }
    }

    const handleIndicatorButtonClick = (indicator) => {
      if (!indicator || !indicator.id) return
      const fallbackColor = getIndicatorColor(activePresetIndicators.value.length)
      const nextParams = pickNextDefaultParams(indicator, activePresetIndicators.value)
      emit('indicator-toggle', {
        action: 'add',
        indicator: {
          ...indicator,
          instanceId: createIndicatorInstanceId(indicator.id),
          params: nextParams,
          style: normalizeIndicatorStyle({}, fallbackColor),
          visible: true,
          calculate: null
        }
      })
    }

    const openIndicatorEditor = (indicator) => {
      if (!indicator || !indicator.id) return
      const template = getIndicatorTemplate(indicator.id)
      const indicatorIndex = activePresetIndicators.value.findIndex(item => (item.instanceId || item.id) === (indicator.instanceId || indicator.id))
      const fallbackColor = indicator.style?.color || getIndicatorColor(indicatorIndex >= 0 ? indicatorIndex : 0)
      indicatorEditorTargetId.value = indicator.instanceId || indicator.id
      const nextParams = normalizeIndicatorParams(template, indicator.params || {})
      Object.keys(indicatorEditorForm).forEach(key => {
        delete indicatorEditorForm[key]
      })
      Object.keys(nextParams).forEach(key => {
        indicatorEditorForm[key] = nextParams[key]
      })
      indicatorEditorForm._styleColor = normalizeIndicatorStyle(indicator.style || {}, fallbackColor).color
      indicatorEditorForm._styleLineWidth = normalizeIndicatorStyle(indicator.style || {}, fallbackColor).lineWidth
      indicatorEditorVisible.value = true
    }

    const closeIndicatorEditor = () => {
      indicatorEditorVisible.value = false
      indicatorEditorTargetId.value = ''
      indicatorEditorSaving.value = false
      Object.keys(indicatorEditorForm).forEach(key => {
        delete indicatorEditorForm[key]
      })
    }

    const removeIndicatorInstance = (indicator) => {
      if (!indicator || !indicator.id) return
      emit('indicator-toggle', {
        action: 'remove',
        indicator: { id: indicator.id, instanceId: indicator.instanceId || indicator.id }
      })
      if (indicatorEditorTargetId.value === (indicator.instanceId || indicator.id)) {
        closeIndicatorEditor()
      }
    }

    const toggleIndicatorVisibility = (indicator) => {
      if (!indicator || !indicator.id) return
      emit('indicator-toggle', {
        action: 'update',
        indicator: {
          ...indicator,
          instanceId: indicator.instanceId || indicator.id,
          visible: indicator.visible === false
        }
      })
    }

    const applyIndicatorEditor = () => {
      const indicator = indicatorEditorTarget.value
      const template = indicatorEditorTemplate.value
      if (!indicator || !template) {
        closeIndicatorEditor()
        return
      }
      const nextParams = normalizeIndicatorParams(template, indicatorEditorForm)
      if (Object.prototype.hasOwnProperty.call(nextParams, 'fast') &&
          Object.prototype.hasOwnProperty.call(nextParams, 'slow') &&
          Number(nextParams.fast) >= Number(nextParams.slow)) {
        proxy.$message.warning(proxy.$t('indicatorIde.editor.fastLessThanSlow'))
        return
      }
      const nextStyle = normalizeIndicatorStyle({
        color: indicatorEditorForm._styleColor,
        lineWidth: indicatorEditorForm._styleLineWidth
      }, indicator.style?.color || getIndicatorColor(0))
      indicatorEditorSaving.value = true
      emit('indicator-toggle', {
        action: 'update',
        indicator: {
          ...indicator,
          instanceId: indicator.instanceId || indicator.id,
          params: nextParams,
          style: nextStyle,
          visible: indicator.visible !== false
        }
      })
      closeIndicatorEditor()
    }

    // Pyodide 相关
    const pyodide = ref(null)
    const loadingPython = ref(false)
    const pythonReady = ref(false)
    const pyodideLoadFailed = ref(false)

    // 主题配置
    const themeConfig = computed(() => {
      if (chartTheme.value === 'dark') {
        return {
          backgroundColor: '#141414',
          textColor: '#d1d4dc',
          textColorSecondary: '#787b86',
          borderColor: '#2a2a2a',
          gridLineColor: '#252525',
          gridLineColorDashed: '#363c4e',
          tooltipBg: 'rgba(25, 27, 32, 0.95)',
          tooltipBorder: '#333',
          tooltipText: '#ccc',
          tooltipTextSecondary: '#888',
          axisLabelColor: '#787b86',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#2a2a2a',
          dataZoomFiller: 'rgba(41, 98, 255, 0.15)',
          dataZoomHandle: '#13c2c2',
          dataZoomText: 'transparent',
          dataZoomBg: '#252525'
        }
      } else {
        return {
          backgroundColor: '#fff',
          textColor: '#333',
          textColorSecondary: '#666',
          borderColor: '#e8e8e8',
          gridLineColor: '#e8e8e8',
          gridLineColorDashed: '#e8e8e8',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: '#e8e8e8',
          tooltipText: '#333',
          tooltipTextSecondary: '#666',
          axisLabelColor: '#666',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#e8e8e8',
          dataZoomFiller: 'rgba(24, 144, 255, 0.15)',
          dataZoomHandle: '#1890ff',
          dataZoomText: '#999',
          dataZoomBg: '#f0f2f5'
        }
      }
    })

    // 根据主题获取指标颜色
    const getIndicatorColor = (idx) => {
      if (chartTheme.value === 'dark') {
        return ['#13c2c2', '#e040fb', '#ffeb3b', '#00e676', '#ff6d00', '#9c27b0'][idx % 6]
      } else {
        return ['#13c2c2', '#9c27b0', '#f57c00', '#1976d2', '#c2185b', '#7b1fa2'][idx % 6]
      }
    }

    // ========== Pyodide 初始化 ==========
    const loadPyodide = () => {
      return new Promise((resolve, reject) => {
        // 检查是否已经加载
        if (window.pyodide) {
          pyodide.value = window.pyodide
          pythonReady.value = true
          resolve(window.pyodide)
          return
        }

        loadingPython.value = true

        // 动态加载 Pyodide（生产环境默认 CDN 优先，避免本地静态资源缺失导致 404 卡住/报错）
        // 可通过环境变量自定义：
        // - VUE_APP_PYODIDE_CDN_BASE: 覆盖 CDN 基础路径（需以 / 结尾或会自动补齐）
        // - VUE_APP_PYODIDE_LOCAL_BASE: 覆盖本地基础路径（需以 / 结尾或会自动补齐）
        // - VUE_APP_PYODIDE_PREFER_CDN: 'true'/'false' 强制优先级
        const PYODIDE_VERSION = '0.25.0'
        const _ensureTrailingSlash = (s) => (s && s.endsWith('/')) ? s : (s ? (s + '/') : s)
        const defaultLocalBase = `/assets/pyodide/v${PYODIDE_VERSION}/full/`
        const defaultCdnBase = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
        const localBase = _ensureTrailingSlash(process.env.VUE_APP_PYODIDE_LOCAL_BASE || defaultLocalBase)
        const cdnBase = _ensureTrailingSlash(process.env.VUE_APP_PYODIDE_CDN_BASE || defaultCdnBase)
        const preferCdnEnv = (process.env.VUE_APP_PYODIDE_PREFER_CDN || '').toString().toLowerCase()
        const preferCdn = preferCdnEnv
          ? (preferCdnEnv === 'true' || preferCdnEnv === '1' || preferCdnEnv === 'yes')
          : (process.env.NODE_ENV === 'production')

        const loadScript = (src) => new Promise((resolve, reject) => {
          // If script already inserted, reuse it
          const existing = document.querySelector(`script[data-pyodide-src="${src}"]`)
          if (existing) {
            // If already loaded, resolve immediately.
            if (typeof window.loadPyodide === 'function') return resolve()
            // Otherwise wait for load/error.
            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener('error', () => reject(new Error('Pyodide 脚本加载失败')), { once: true })
            return
          }

          const s = document.createElement('script')
          s.dataset.pyodideSrc = src
          s.src = src
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Pyodide 脚本加载失败'))
          document.head.appendChild(s)
        })

        const initFromBase = async (baseUrl) => {
          if (typeof window.loadPyodide !== 'function') {
            throw new Error('loadPyodide 函数未找到')
          }
          window.pyodide = await window.loadPyodide({ indexURL: baseUrl })

              // 预加载 pandas 和 numpy
              await window.pyodide.loadPackage(['pandas', 'numpy'])

              pyodide.value = window.pyodide
              pythonReady.value = true
              loadingPython.value = false
              resolve(window.pyodide)
        }

        (async () => {
          const tryLoad = async (base) => {
            await loadScript(base + 'pyodide.js')
            await initFromBase(base)
          }

          try {
            if (preferCdn) {
              // 1) CDN-first (production default)
              await tryLoad(cdnBase)
            } else {
              // 1) Local-first (dev convenience)
              await tryLoad(localBase)
            }
          } catch (firstErr) {
            try {
              // 2) Fallback
              await tryLoad(preferCdn ? localBase : cdnBase)
            } catch (secondErr) {
              throw secondErr || firstErr
            }
          }
        })().catch((err) => {
          loadingPython.value = false
          pyodideLoadFailed.value = true
          reject(err)
        })
      })
    }

    // ========== Python 代码解析 ==========
    // 解析 Python 代码，提取参数信息
    const parsePythonStrategy = (code) => {
      if (!code || typeof code !== 'string') {
        return null
      }

      try {
        // 简单的参数提取：查找类似 @param 或 #param 的注释，或者函数参数
        // 提取可能的参数
        const params = {}

        // 尝试从代码中提取参数（如果有的话）
        // 例如：查找类似 span=144 这样的参数
        const paramMatches = code.match(/(\w+)\s*=\s*(\d+\.?\d*)/g)
        if (paramMatches) {
          paramMatches.forEach(match => {
            const parts = match.split('=')
            if (parts.length === 2) {
              const key = parts[0].trim()
              const value = parseFloat(parts[1].trim())
              if (!isNaN(value)) {
                params[key] = value
              }
            }
          })
        }

        // 返回解析结果
        return {
          params: params,
          plots: [], // 从代码中无法直接提取 plots，需要在执行时确定
          success: true
        }
      } catch (err) {
        // 即使解析失败，也返回一个基本对象，允许执行
        return {
          params: {},
          plots: [],
          success: false
        }
      }
    }

    // ========== Python 执行引擎 ==========
    const executePythonStrategy = async (userCode, klineData, params = {}, indicatorInfo = {}) => {
      if (!pythonReady.value || !pyodide.value) {
        // 如果正在加载，等待一段时间后重试
        if (loadingPython.value) {
          // 等待最多 15 秒（30次 * 500ms）
          let waitCount = 0
          while (loadingPython.value && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 500))
            waitCount++
            // 如果加载完成，退出循环
            if (pythonReady.value && pyodide.value) {
              break
            }
          }
        }

        // 如果仍然未就绪，检查是否加载失败
        if (!pythonReady.value || !pyodide.value) {
          // 如果不在加载中，说明加载失败或超时
          if (!loadingPython.value) {
            pyodideLoadFailed.value = true
          } else {
            // 如果还在加载中但超时了，也标记为失败
            loadingPython.value = false
            pyodideLoadFailed.value = true
          }
          throw new Error('Python 引擎未就绪，请等待加载完成')
        }
      }

      try {
        // 检查代码是否需要解密（购买的指标）
        let finalCode = userCode
        const isEncrypted = indicatorInfo.is_encrypted || indicatorInfo.isEncrypted || 0
        if (isEncrypted || needsDecrypt(userCode, isEncrypted)) {
          // 获取用户ID（优先级：indicatorInfo > props > params）
          const userId = indicatorInfo.user_id || indicatorInfo.userId || props.userId || params.userId
          // 使用原始数据库ID（originalId），如果没有则使用id
          const indicatorId = indicatorInfo.originalId || indicatorInfo.id || params.indicatorId

          if (userId && indicatorId) {
            try {
              finalCode = await decryptCodeAuto(finalCode, userId, indicatorId)
            } catch (decryptError) {
              throw new Error('代码解密失败，无法执行指标: ' + (decryptError.message || '未知错误'))
            }
          } else {
            throw new Error('缺少必要的解密参数（用户ID或指标ID），无法执行加密指标')
          }
        }
        // 1. 数据转换：将 JS 的 klineData / params 转换为 JSON 字符串
        // klineData 可能是内部格式（time）或 KLineChart 格式（timestamp）
        const rawData = klineData.map(item => {
          // 兼容两种格式
          let timeValue = item.timestamp || item.time
          // 如果是秒级时间戳，转换为毫秒
          if (timeValue < 1e10) {
            timeValue = timeValue * 1000
          }
          return {
            time: Math.floor(timeValue / 1000), // Python 端使用秒级时间戳
            open: parseFloat(item.open) || 0,
            high: parseFloat(item.high) || 0,
            low: parseFloat(item.low) || 0,
            close: parseFloat(item.close) || 0,
            volume: parseFloat(item.volume) || 0
          }
        })
        const rawDataJson = JSON.stringify(rawData)
        const paramsJson = JSON.stringify(params || {})

        // 2. 构建 Python 执行代码
        // 转义 JSON 字符串中的特殊字符
        const escapedJson = rawDataJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        const escapedParams = paramsJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')

        const pythonCode = `
import json
import pandas as pd
import numpy as np

# 递归清理 NaN 值的函数
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(item) for item in obj]
    elif isinstance(obj, (pd.Series, np.ndarray)):
        return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x for x in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif pd.isna(obj):
        return None
    else:
        return obj

# 接收 JSON 数据
raw_data = json.loads('${escapedJson}')
params = json.loads('${escapedParams}')

# 将前端参数注入为指标代码可直接使用的变量（对齐回测/实盘执行环境）
# 兼容多种命名（snake_case / camelCase）
def _get_param(key, default=None):
    if key in params:
        return params.get(key, default)
    # camelCase fallback
    camel = ''.join([key.split('_')[0]] + [p.capitalize() for p in key.split('_')[1:]])
    return params.get(camel, default)

try:
    leverage = float(_get_param('leverage', 1) or 1)
except Exception:
    leverage = 1

trade_direction = _get_param('trade_direction', _get_param('tradeDirection', 'both')) or 'both'

try:
    initial_position = int(_get_param('initial_position', 0) or 0)
except Exception:
    initial_position = 0

try:
    initial_avg_entry_price = float(_get_param('initial_avg_entry_price', 0.0) or 0.0)
except Exception:
    initial_avg_entry_price = 0.0

try:
    initial_position_count = int(_get_param('initial_position_count', 0) or 0)
except Exception:
    initial_position_count = 0

try:
    initial_last_add_price = float(_get_param('initial_last_add_price', 0.0) or 0.0)
except Exception:
    initial_last_add_price = 0.0

try:
    initial_highest_price = float(_get_param('initial_highest_price', 0.0) or 0.0)
except Exception:
    initial_highest_price = 0.0

# 转换为 DataFrame
df = pd.DataFrame(raw_data)

# 转换数据类型
df['open'] = df['open'].astype(float)
df['high'] = df['high'].astype(float)
df['low'] = df['low'].astype(float)
df['close'] = df['close'].astype(float)
df['volume'] = df['volume'].astype(float)

# 用户代码（已解密）
${finalCode}

# 构造输出（如果用户没有定义 output，则尝试从 result_json 获取）
if 'output' not in locals():
    if 'result_json' in locals():
        output = json.loads(result_json)
    else:
        output = {"plots": []}
else:
    # 确保 output 是字典格式
    if isinstance(output, str):
        output = json.loads(output)

# 清理 output 中的所有 NaN 值
output = clean_nan(output)

# 返回 JSON 字符串
json.dumps(output)
`

        // 3. 执行 Python 代码
        const resultJson = await pyodide.value.runPythonAsync(pythonCode)

        // 检查返回结果
        if (!resultJson || typeof resultJson !== 'string') {
          throw new Error(`Python 代码执行后未返回有效的 JSON 字符串，返回类型: ${typeof resultJson}`)
        }

        let result
        try {
          result = JSON.parse(resultJson)
        } catch (parseError) {
          throw new Error(`JSON 解析失败: ${parseError.message}。可能是数据中包含 NaN 或其他无效值。`)
        }

        // 4. 验证和格式化输出
        if (!result) {
          return { plots: [], signals: [], calculatedVars: {} }
        }

        // 确保 plots 存在且为数组
        if (!result.plots || !Array.isArray(result.plots)) {
          result.plots = []
        }

        // 5. 处理每个 plot 的数据，将 NaN 转换为 null
        result.plots = result.plots.map(plot => {
          if (plot.data && Array.isArray(plot.data)) {
            plot.data = plot.data.map(val => {
              if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                return null
              }
              return val
            })
          }
          return plot
        })

        // 6. 处理 signals（如果有）
        if (result.signals && Array.isArray(result.signals)) {
          result.signals = result.signals.map(signal => {
            if (signal.data && Array.isArray(signal.data)) {
              signal.data = signal.data.map(val => {
                if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                  return null
                }
                return val
              })
            }
            return signal
          })
        }

        // 7. 确保 calculatedVars 存在
        if (!result.calculatedVars) {
          result.calculatedVars = {}
        }

        return result
      } catch (err) {
        throw new Error(`Python 执行失败: ${err.message}`)
      }
    }

    // --- 指标计算函数 ---
    // 这些函数可能通过 indicator.calculate 间接调用，所以 ESLint 可能无法识别

    // eslint-disable-next-line no-unused-vars
    function calculateSMA (data, length) {
      const result = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          result.push(null)
        } else {
          let sum = 0
          for (let j = i - length + 1; j <= i; j++) {
            sum += data[j].close
          }
          result.push(sum / length)
        }
      }
      return result
    }

    function calculateEMA (data, length) {
      const result = []
      const multiplier = 2 / (length + 1)
      let ema = null
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          ema = data[i].close
        } else {
          ema = (data[i].close - ema) * multiplier + ema
        }
        result.push(ema)
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateBollingerBands (data, length, mult) {
      // 内部计算SMA
      const sma = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          sma.push(null)
        } else {
          let sum = 0
          for (let j = i - length + 1; j <= i; j++) {
            sum += data[j].close
          }
          sma.push(sum / length)
        }
      }

      const result = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          result.push({ upper: null, middle: null, lower: null })
          continue
        }
        let sum = 0
        for (let j = i - length + 1; j <= i; j++) {
          sum += Math.pow(data[j].close - sma[i], 2)
        }
        const std = Math.sqrt(sum / length)
        result.push({
          upper: sma[i] + mult * std,
          middle: sma[i],
          lower: sma[i] - mult * std
        })
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateRSI (data, length) {
      const result = []
      let avgGain = 0
      let avgLoss = 0

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          result.push(null)
          continue
        }

        const change = data[i].close - data[i - 1].close
        const gain = change > 0 ? change : 0
        const loss = change < 0 ? Math.abs(change) : 0

        if (i < length) {
          // 前length-1个值，累积但不计算RSI
          result.push(null)
        } else if (i === length) {
          // 第length个值，计算初始平均值
          let sumGain = 0
          let sumLoss = 0
          for (let j = 1; j <= length; j++) {
            const chg = data[j].close - data[j - 1].close
            if (chg > 0) sumGain += chg
            else sumLoss += Math.abs(chg)
          }
          avgGain = sumGain / length
          avgLoss = sumLoss / length
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          result.push(100 - (100 / (1 + rs)))
        } else {
          // 后续值，使用平滑移动平均
          avgGain = (avgGain * (length - 1) + gain) / length
          avgLoss = (avgLoss * (length - 1) + loss) / length
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          result.push(100 - (100 / (1 + rs)))
        }
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateMACD (data, fast, slow, signal) {
      const fastEMA = calculateEMA(data, fast)
      const slowEMA = calculateEMA(data, slow)
      const macdLine = []

      // 计算MACD线
      for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] == null || slowEMA[i] == null) {
          macdLine.push(null)
        } else {
          macdLine.push(fastEMA[i] - slowEMA[i])
        }
      }

      // 计算Signal线 (MACD的EMA)
      // 需要保持原始数组长度，对null值进行特殊处理
      const signalLine = []
      const histogram = []
      let signalEMA = null
      let signalStartIdx = -1

      // 找到第一个非null的MACD值作为signal计算的起点
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null && signalStartIdx === -1) {
          signalStartIdx = i
          signalEMA = macdLine[i]
          break
        }
      }

      // 如果找到了起点，继续计算signal
      if (signalStartIdx >= 0) {
        const multiplier = 2 / (signal + 1)
        for (let i = 0; i < macdLine.length; i++) {
          if (i < signalStartIdx + signal - 1) {
            // signal需要等待足够的MACD值
            signalLine.push(null)
            histogram.push(null)
          } else if (macdLine[i] === null) {
            signalLine.push(null)
            histogram.push(null)
          } else {
            if (i === signalStartIdx + signal - 1) {
              // 第一个signal值：计算前signal个MACD值的平均值
              let sum = 0
              let count = 0
              for (let j = signalStartIdx; j <= i; j++) {
                if (macdLine[j] !== null) {
                  sum += macdLine[j]
                  count++
                }
              }
              signalEMA = sum / count
            } else {
              // 后续值：使用EMA公式
              signalEMA = (macdLine[i] - signalEMA) * multiplier + signalEMA
            }
            signalLine.push(signalEMA)
            histogram.push(macdLine[i] - signalEMA)
          }
        }
      } else {
        // 如果没有有效的MACD值，全部设为null
        for (let i = 0; i < macdLine.length; i++) {
          signalLine.push(null)
          histogram.push(null)
        }
      }

      return { macd: macdLine, signal: signalLine, histogram }
    }

    // 计算ATR（平均真实波幅）
    function calculateATR (data, period) {
      const tr = [] // 真实波幅
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          tr.push(data[i].high - data[i].low)
        } else {
          const hl = data[i].high - data[i].low
          const hc = Math.abs(data[i].high - data[i - 1].close)
          const lc = Math.abs(data[i].low - data[i - 1].close)
          tr.push(Math.max(hl, hc, lc))
        }
      }

      // 计算ATR（TR的SMA）
      const atr = []
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          atr.push(null)
        } else {
          let sum = 0
          for (let j = i - period + 1; j <= i; j++) {
            sum += tr[j]
          }
          atr.push(sum / period)
        }
      }
      return atr
    }

    // 计算CCI (商品通道指数)
    function calculateCCI (data, length) {
      const cci = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          cci.push(null)
        } else {
          // 计算典型价格 (TP)
          const tp = []
          for (let j = i - length + 1; j <= i; j++) {
            tp.push((data[j].high + data[j].low + data[j].close) / 3)
          }
          // 计算TP的SMA
          const sma = tp.reduce((sum, val) => sum + val, 0) / length
          // 计算平均偏差
          const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / length
          // 计算CCI
          const currentTP = (data[i].high + data[i].low + data[i].close) / 3
          const cciValue = meanDev === 0 ? 0 : (currentTP - sma) / (0.015 * meanDev)
          cci.push(cciValue)
        }
      }
      return cci
    }

    // 计算Williams %R (威廉指标)
    function calculateWilliamsR (data, length) {
      const williamsR = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          williamsR.push(null)
        } else {
          let highest = -Infinity
          let lowest = Infinity
          for (let j = i - length + 1; j <= i; j++) {
            highest = Math.max(highest, data[j].high)
            lowest = Math.min(lowest, data[j].low)
          }
          const wr = (highest - lowest) === 0 ? -50 : ((highest - data[i].close) / (highest - lowest)) * -100
          williamsR.push(wr)
        }
      }
      return williamsR
    }

    // 计算MFI (资金流量指标)
    function calculateMFI (data, length) {
      const mfi = []
      for (let i = 0; i < data.length; i++) {
        if (i < length) {
          mfi.push(null)
        } else {
          let positiveFlow = 0
          let negativeFlow = 0
          for (let j = i - length + 1; j <= i; j++) {
            const typicalPrice = (data[j].high + data[j].low + data[j].close) / 3
            const rawMoneyFlow = typicalPrice * data[j].volume
            if (j > i - length + 1) {
              const prevTypicalPrice = (data[j - 1].high + data[j - 1].low + data[j - 1].close) / 3
              if (typicalPrice > prevTypicalPrice) {
                positiveFlow += rawMoneyFlow
              } else if (typicalPrice < prevTypicalPrice) {
                negativeFlow += rawMoneyFlow
              }
            }
          }
          const moneyFlowRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
          const mfiValue = 100 - (100 / (1 + moneyFlowRatio))
          mfi.push(mfiValue)
        }
      }
      return mfi
    }

    // 计算ADX (平均趋向指数) 和 DMI (+DI, -DI)
    function calculateADX (data, length) {
      const plusDI = []
      const minusDI = []
      const adx = []

      // 计算真实波幅(TR)和方向移动(+DM, -DM)
      const tr = []
      const plusDM = []
      const minusDM = []

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          tr.push(data[i].high - data[i].low)
          plusDM.push(0)
          minusDM.push(0)
        } else {
          const hl = data[i].high - data[i].low
          const hc = Math.abs(data[i].high - data[i - 1].close)
          const lc = Math.abs(data[i].low - data[i - 1].close)
          tr.push(Math.max(hl, hc, lc))

          const upMove = data[i].high - data[i - 1].high
          const downMove = data[i - 1].low - data[i].low

          if (upMove > downMove && upMove > 0) {
            plusDM.push(upMove)
          } else {
            plusDM.push(0)
          }

          if (downMove > upMove && downMove > 0) {
            minusDM.push(downMove)
          } else {
            minusDM.push(0)
          }
        }
      }

      // 计算平滑的TR, +DM, -DM
      const smoothTR = []
      const smoothPlusDM = []
      const smoothMinusDM = []

      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          smoothTR.push(null)
          smoothPlusDM.push(null)
          smoothMinusDM.push(null)
          plusDI.push(null)
          minusDI.push(null)
          adx.push(null)
        } else if (i === length - 1) {
          // 初始值：简单求和
          let sumTR = 0
          let sumPlusDM = 0
          let sumMinusDM = 0
          for (let j = 0; j <= i; j++) {
            sumTR += tr[j]
            sumPlusDM += plusDM[j]
            sumMinusDM += minusDM[j]
          }
          smoothTR.push(sumTR)
          smoothPlusDM.push(sumPlusDM)
          smoothMinusDM.push(sumMinusDM)
        } else {
          // 平滑计算：Wilder's smoothing
          smoothTR.push(smoothTR[i - 1] - (smoothTR[i - 1] / length) + tr[i])
          smoothPlusDM.push(smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / length) + plusDM[i])
          smoothMinusDM.push(smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / length) + minusDM[i])
        }

        if (i >= length - 1) {
          const trVal = smoothTR[i]
          const plusDMVal = smoothPlusDM[i]
          const minusDMVal = smoothMinusDM[i]

          if (trVal === 0) {
            plusDI.push(0)
            minusDI.push(0)
          } else {
            plusDI.push((plusDMVal / trVal) * 100)
            minusDI.push((minusDMVal / trVal) * 100)
          }

          // 计算DX
          if (i >= length - 1) {
            const diSum = plusDI[i] + minusDI[i]
            const dx = diSum === 0 ? 0 : Math.abs(plusDI[i] - minusDI[i]) / diSum * 100

            // 计算ADX (DX的平滑)
            if (i === length - 1) {
              adx.push(dx)
            } else if (i === length) {
              // 第二个ADX值：前两个DX的平均值
              const prevDX = Math.abs(plusDI[i - 1] - minusDI[i - 1]) / (plusDI[i - 1] + minusDI[i - 1]) * 100
              adx.push((prevDX + dx) / 2)
            } else {
              // ADX平滑：Wilder's smoothing
              adx.push((adx[i - 1] * (length - 1) + dx) / length)
            }
          }
        }
      }

      return { adx, plusDI, minusDI }
    }

    // 计算OBV (能量潮指标)
    function calculateOBV (data) {
      const obv = []
      let obvValue = 0

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          obvValue = data[i].volume
        } else {
          if (data[i].close > data[i - 1].close) {
            obvValue += data[i].volume
          } else if (data[i].close < data[i - 1].close) {
            obvValue -= data[i].volume
          }
          // 如果收盘价相同，OBV不变
        }
        obv.push(obvValue)
      }
      return obv
    }

    // 计算AD (积累/派发线)
    function calculateAD (data) {
      const ad = []
      let adValue = 0

      for (let i = 0; i < data.length; i++) {
        const high = data[i].high
        const low = data[i].low
        const close = data[i].close
        const volume = data[i].volume

        if (high !== low) {
          const clv = ((close - low) - (high - close)) / (high - low)
          adValue += clv * volume
        }
        ad.push(adValue)
      }
      return ad
    }

    // 计算ADOSC (积累/派发振荡器) = AD的快速EMA - AD的慢速EMA
    function calculateADOSC (data, fast, slow) {
      const ad = calculateAD(data)
      const fastEMA = []
      const slowEMA = []
      const adosc = []

      const fastMultiplier = 2 / (fast + 1)
      const slowMultiplier = 2 / (slow + 1)

      let fastEMAValue = ad[0]
      let slowEMAValue = ad[0]

      for (let i = 0; i < ad.length; i++) {
        if (i === 0) {
          fastEMA.push(ad[0])
          slowEMA.push(ad[0])
          adosc.push(0)
        } else {
          fastEMAValue = (ad[i] - fastEMAValue) * fastMultiplier + fastEMAValue
          slowEMAValue = (ad[i] - slowEMAValue) * slowMultiplier + slowEMAValue

          fastEMA.push(fastEMAValue)
          slowEMA.push(slowEMAValue)
          adosc.push(fastEMAValue - slowEMAValue)
        }
      }

      return adosc
    }

    // 计算KDJ (随机指标)
    function calculateKDJ (data, period, kPeriod, dPeriod) {
      const kValues = []
      const dValues = []
      const jValues = []

      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          kValues.push(null)
          dValues.push(null)
          jValues.push(null)
        } else {
          // 找到period内的最高价和最低价
          let highest = -Infinity
          let lowest = Infinity
          for (let j = i - period + 1; j <= i; j++) {
            highest = Math.max(highest, data[j].high)
            lowest = Math.min(lowest, data[j].low)
          }

          // 计算RSV
          const rsv = (highest - lowest) === 0 ? 50 : ((data[i].close - lowest) / (highest - lowest)) * 100

          // 计算K值 (RSV的移动平均)
          if (kValues[i - 1] === null) {
            kValues.push(rsv)
          } else {
            kValues.push((rsv * 2 + kValues[i - 1] * (kPeriod - 2)) / kPeriod)
          }

          // 计算D值 (K值的移动平均)
          if (dValues[i - 1] === null) {
            dValues.push(kValues[i])
          } else {
            dValues.push((kValues[i] * 2 + dValues[i - 1] * (dPeriod - 2)) / dPeriod)
          }

          // 计算J值
          jValues.push(3 * kValues[i] - 2 * dValues[i])
        }
      }

      return { k: kValues, d: dValues, j: jValues }
    }

    // ========== 注册自定义信号 Overlay (Signal Tag) ==========
    // 这是一个能够绘制 "圆点 + 带背景色文字框" 的自定义覆盖物
// ========== 注册自定义信号 Overlay (Signal Tag) ==========
registerOverlay({
      name: 'signalTag',
      // 【关键修改1】必须改为 1。告诉图表这个图形只需要一个点就画完了。
      // 只要这里是 1，图表就不会画那个蓝色的"编辑中"手柄。
      totalStep: 1,

      // 【关键修改2】彻底禁止该 Overlay 响应任何鼠标事件
      // 这样鼠标放上去也不会有蓝色的选中框
      lock: true,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,

      // 【建议保留】进一步确保不拦截事件
      checkEventOn: () => false,

      createPointFigures: ({ coordinates, overlay }) => {
        const { text } = overlay.extendData || {}
        const color = overlay.extendData?.color || '#555555'

        // 1. 获取信号点坐标
        if (!coordinates[0]) return []
        const x = coordinates[0].x
        const signalY = coordinates[0].y // Point 0: Python中计算的标签位置（已包含垂直间距）

        // 2. 获取K线极值坐标（用于画圆点）
        const anchorY = coordinates[1] ? coordinates[1].y : signalY // Point 1: K线的high/low

        const boxPaddingX = 8
        const boxPaddingY = 4
        const fontSize = 12
        const textStr = String(text || '')
        // 简单的字符宽度估算
        const textWidth = textStr.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 12 : 7), 0)
        const boxWidth = textWidth + boxPaddingX * 2
        const boxHeight = fontSize + boxPaddingY * 2

        // Compatibility: old overlays used extendData.type='buy'/'sell', new overlays use extendData.side='buy'/'sell'
        const side = overlay.extendData?.side || overlay.extendData?.type || 'buy'
        const isBuy = side === 'buy'

        // 3. 计算 Box 的 Y 轴位置
        // 【关键修改】直接使用 signalY（Python中已经调整好的位置），不再使用固定margin
        // signalY 已经包含了反转信号的垂直间距调整
        const boxY = isBuy ? signalY : (signalY - boxHeight)

        // 计算线段连接点
        // 圆点画在K线极值位置（anchorY），紧挨着K线
        // 连线从圆点连到标签框
        const circleY = anchorY // 圆点位置：K线的High或Low
        const lineStartY = circleY // 连线起点：圆点位置
        const lineEndY = isBuy ? boxY : (boxY + boxHeight) // 连线终点：标签框边缘

        return [
          // 1. 虚线 (从圆点连到标签框)
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: lineStartY }, // 从圆点（K线极值位置）
                { x, y: lineEndY } // 连到标签框边缘
              ]
            },
            styles: { style: 'stroke', color: color, dashedValue: [2, 2] },
            ignoreEvent: true
          },
          // 2. 圆点 (画在K线极值位置，紧挨着K线)
          {
            type: 'circle',
            attrs: { x, y: circleY, r: 4 },
            styles: { style: 'fill', color: color },
            ignoreEvent: true
          },
          // 3. 背景框 (基于 boxY)
          {
            type: 'rect',
            attrs: {
              x: x - boxWidth / 2,
              y: boxY,
              width: boxWidth,
              height: boxHeight,
              r: 4
            },
            styles: { style: 'fill', color: color, borderSize: 0 },
            ignoreEvent: true
          },
          // 4. 文字
          {
            type: 'text',
            attrs: {
              x: x,
              y: boxY + boxHeight / 2,
              text: textStr,
              align: 'center',
              baseline: 'middle'
            },
            styles: { color: '#ffffff', size: fontSize, weight: 'bold', backgroundColor: color, borderRadius: 5 },
            ignoreEvent: true
          }
        ]
      }
    })

    // ========== 注册价格测量工具 Overlay (Price Range Measure) ==========
    // 类似 TradingView 的测量工具，显示两点之间的价格变化和涨跌幅
    registerOverlay({
      name: 'priceRangeMeasure',
      totalStep: 2, // 需要两个点：起点和终点
      lock: false, // 允许编辑
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,

      createPointFigures: ({ coordinates, overlay, ctx }) => {
        if (!coordinates[0] || !coordinates[1]) return []

        const startPoint = overlay.points[0]
        const endPoint = overlay.points[1]

        if (!startPoint || !endPoint) return []

        // 获取起点和终点的价格
        const startPrice = startPoint.value
        const endPrice = endPoint.value
        const priceChange = endPrice - startPrice
        const percentChange = (priceChange / startPrice) * 100

        // 计算时间跨度（通过时间戳差值）
        const startTimestamp = startPoint.timestamp
        const endTimestamp = endPoint.timestamp
        const timeDiff = Math.abs(endTimestamp - startTimestamp)

        // 格式化时间跨度
        let timeSpan = ''
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

        if (days > 0) {
          timeSpan = `${days}天${hours > 0 ? hours + '小时' : ''}`
        } else if (hours > 0) {
          timeSpan = `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
        } else if (minutes > 0) {
          timeSpan = `${minutes}分钟`
        } else {
          timeSpan = `${seconds}秒`
        }

        // 尝试从图表实例获取数据来计算K线数量
        let barCount = 0
        try {
          if (ctx && ctx.chart) {
            const chartData = ctx.chart.getData()
            if (chartData && Array.isArray(chartData) && chartData.length > 0) {
              const startIndex = chartData.findIndex(item => Math.abs(item.timestamp - startTimestamp) < 1000)
              const endIndex = chartData.findIndex(item => Math.abs(item.timestamp - endTimestamp) < 1000)
              if (startIndex >= 0 && endIndex >= 0) {
                barCount = Math.abs(endIndex - startIndex)
              }
            }
          }
        } catch (e) {
          // 如果无法获取数据，忽略错误
        }

        // 格式化显示文本
        const percentStr = percentChange >= 0
          ? `+${percentChange.toFixed(2)}%`
          : `${percentChange.toFixed(2)}%`
        const pp = pricePrecision.value
        const priceChangeStr = priceChange >= 0
          ? `+${priceChange.toFixed(pp)}`
          : `${priceChange.toFixed(pp)}`

        // 构建显示文本
        let displayText = `${percentStr}  ${priceChangeStr}`
        if (barCount > 0) {
          displayText += `  (${barCount}根`
          if (timeSpan) {
            displayText += ` / ${timeSpan}`
          }
          displayText += ')'
        } else if (timeSpan) {
          displayText += `  (${timeSpan})`
        }

        // 根据涨跌设置颜色
        const isUp = priceChange >= 0
        const lineColor = isUp ? '#0ecb81' : '#f6465d'
        const textColor = isUp ? '#0ecb81' : '#f6465d'
        const bgColor = isUp ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)'

        const x1 = coordinates[0].x
        const y1 = coordinates[0].y
        const x2 = coordinates[1].x
        const y2 = coordinates[1].y

        // 计算文本位置（在线的中点上方）
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        const textOffsetY = -20 // 文本在线上方

        // 估算文本宽度
        const fontSize = 12
        const textWidth = displayText.length * 7 + 16 // 简单估算
        const textHeight = fontSize + 8

        return [
          // 1. 连接线（带箭头）
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: x1, y: y1 },
                { x: x2, y: y2 }
              ]
            },
            styles: {
              style: 'stroke',
              color: lineColor,
              size: 2,
              dashedValue: [4, 4] // 虚线样式
            },
            ignoreEvent: false
          },
          // 2. 起点标记（小圆点）
          {
            type: 'circle',
            attrs: { x: x1, y: y1, r: 4 },
            styles: { style: 'fill', color: lineColor },
            ignoreEvent: false
          },
          // 3. 终点标记（小圆点）
          {
            type: 'circle',
            attrs: { x: x2, y: y2, r: 4 },
            styles: { style: 'fill', color: lineColor },
            ignoreEvent: false
          },
          // 4. 文本背景框
          {
            type: 'rect',
            attrs: {
              x: midX - textWidth / 2,
              y: midY + textOffsetY - textHeight / 2,
              width: textWidth,
              height: textHeight,
              r: 4
            },
            styles: {
              style: 'fill',
              color: bgColor,
              borderSize: 1,
              borderColor: lineColor
            },
            ignoreEvent: false
          },
          // 5. 文本
          {
            type: 'text',
            attrs: {
              x: midX,
              y: midY + textOffsetY,
              text: displayText,
              align: 'center',
              baseline: 'middle'
            },
            styles: {
              color: textColor,
              size: fontSize,
              weight: 'bold'
            },
            ignoreEvent: false
          }
        ]
      }
    })

    // --- 数据加载相关函数 ---
    // 格式化数据为 KLineChart 格式（timestamp 需要是毫秒）
    const formatKlineData = (data) => {
      return data.map(item => {
        let timeValue = item.time || item.timestamp
        if (typeof timeValue === 'string') {
          timeValue = parseInt(timeValue)
        }
        // KLineChart 需要毫秒时间戳，如果当前是秒级，转换为毫秒
        if (timeValue < 1e10) {
          timeValue = timeValue * 1000
        }
        return {
          timestamp: timeValue,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        }
      }).filter(item => item.timestamp && !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close))
        .sort((a, b) => a.timestamp - b.timestamp)
    }

    /** 用于判断合并后的 K 线与合并前是否一致，避免无意义的 updateData */
    const klineBarSnapshotKey = (b) => {
      if (!b) return ''
      const p = pricePrecision.value + 2
      const q = (x) => (Number(x) || 0).toFixed(p)
      return [q(b.open), q(b.high), q(b.low), q(b.close), q(b.volume)].join('|')
    }

    const flushRealtimeChartBar = (bar) => {
      if (!chartRef.value || typeof chartRef.value.updateData !== 'function') return
      try {
        chartRef.value.updateData(bar)
      } catch (e) {
        try {
          chartRef.value.applyNewData(klineData.value)
        } catch (_) {}
      }
    }

    const scheduleRealtimeChartBarUpdate = (bar) => {
      if (realtimeChartRafId != null) {
        cancelAnimationFrame(realtimeChartRafId)
      }
      realtimeChartRafId = requestAnimationFrame(() => {
        realtimeChartRafId = null
        flushRealtimeChartBar(bar)
      })
    }

    /**
     * @param {Array} data 内部格式 K 线
     * @param {{ force?: boolean }} options force=true 时总是向父组件发价格（换标的/全量加载）
     */
    const updatePricePanel = (data, options = {}) => {
      const force = !!(options && options.force)
      if (!data || data.length === 0) return
      const last = data[data.length - 1]
      let sig
      let payload
      if (data.length > 1) {
        const prev = data[data.length - 2]
        const price = formatPrice(last.close)
        const change = ((last.close - prev.close) / prev.close) * 100
        sig = `${price}|${change.toFixed(3)}`
        payload = { price, change }
      } else {
        const price = formatPrice(last.close)
        sig = `${price}|0`
        payload = { price, change: 0 }
      }
      if (!force && sig === lastPriceEmitSig.value) return
      lastPriceEmitSig.value = sig
      emit('price-change', payload)
    }

    // 将 KLineChart 格式的数据转换为内部格式（用于 isSameTimeframe 等函数）
    const convertToInternalFormat = (data) => {
      return data.map(item => ({
        time: Math.floor(item.timestamp / 1000), // 转回秒级时间戳用于比较
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }))
    }

    const isSameTimeframe = (time1, time2, tf) => {
      const date1 = new Date(time1 * 1000)
      const date2 = new Date(time2 * 1000)

      switch (tf) {
        case '1m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 date1.getMinutes() === date2.getMinutes()
        case '5m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 5) === Math.floor(date2.getMinutes() / 5)
        case '15m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 15) === Math.floor(date2.getMinutes() / 15)
        case '30m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 30) === Math.floor(date2.getMinutes() / 30)
        case '1H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours()
        case '4H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 Math.floor(date1.getHours() / 4) === Math.floor(date2.getHours() / 4)
        case '1D':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate()
        case '1W':
          const week1 = Math.floor((date1.getTime() - new Date(date1.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          const week2 = Math.floor((date2.getTime() - new Date(date2.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          return date1.getFullYear() === date2.getFullYear() && week1 === week2
        default:
          return time1 === time2
      }
    }

    const loadKlineData = async (silent = false) => {
      if (!props.symbol) return
      if (loading.value && !silent) return

      // 立即停止旧的实时数据源（WS / REST），防止旧标的数据污染新数据
      stopRealtime()

      loading.value = true
      error.value = null

      try {
        let formattedData = []
        try {
          const response = await request({
            url: '/api/indicator/kline',
            method: 'get',
            params: {
              market: props.market,
              symbol: props.symbol,
              timeframe: props.timeframe,
              limit: 500
            }
          })

          if (response.code === 1 && response.data && Array.isArray(response.data)) {
            formattedData = formatKlineData(response.data)
          } else {
            // 特殊处理 Tiingo 订阅限制提示
            let errMsg = response.msg || '获取K线数据失败'
            if (response.hint === 'tiingo_subscription') {
              errMsg = proxy.$t('dashboard.indicator.error.tiingoSubscription') || 'Forex 1-minute data requires Tiingo paid subscription'
            }
            throw new Error(errMsg)
          }
        } catch (apiErr) {
          throw apiErr
        }

        // 检查数据是否为空
        if (!formattedData || formattedData.length === 0) {
          throw new Error('未获取到K线数据')
        }

        klineData.value = formattedData
        hasMoreHistory.value = true

        // 根据数据自动推算价格精度并设置到图表
        pricePrecision.value = calcPricePrecision(formattedData)

        const internalData = convertToInternalFormat(formattedData)
        updatePricePanel(internalData, { force: true })

        nextTick(() => {
          if (!chartRef.value) {
            initChart()
          } else {
            // 设置图表精度（必须在 applyNewData 之前）
            if (typeof chartRef.value.setPriceVolumePrecision === 'function') {
              chartRef.value.setPriceVolumePrecision(pricePrecision.value, 0)
            }

            // 确保数据格式正确
            const validData = klineData.value.filter(item =>
              item.timestamp &&
              !isNaN(item.open) &&
              !isNaN(item.high) &&
              !isNaN(item.low) &&
              !isNaN(item.close)
            )

            if (validData.length > 0 && chartRef.value) {
              // 使用 applyNewData 初始化
              try {
                chartRef.value.applyNewData(validData)
              } catch (e) {
                chartRef.value.applyNewData(validData)
              }

              // 延迟更新指标
              setTimeout(() => {
                if (chartRef.value) {
                  updateIndicators()
                }
              }, 100)
            }
          }

          if (props.realtimeEnabled) {
            startRealtime()
          }

          // 如果初始数据明显不足（如美股小时线），自动补充加载历史
          if (formattedData.length < 200 && hasMoreHistory.value) {
            setTimeout(() => {
              if (klineData.value.length > 0 && klineData.value.length < 200 && hasMoreHistory.value) {
                loadMoreHistoryDataForScroll(klineData.value[0].timestamp)
              }
            }, 1500)
          }
        })
      } catch (err) {
        error.value = proxy.$t('dashboard.indicator.error.loadDataFailed') + ': ' + (err.message || proxy.$t('dashboard.indicator.error.loadDataFailedDesc'))
        // 清空K线数据，不显示图表
        klineData.value = []
        // 如果有图表实例，清空数据
        if (chartRef.value) {
          try {
            chartRef.value.applyNewData([])
          } catch (e) {
          }
        }
      } finally {
        loading.value = false
      }
    }

    // 加载更多历史数据（用于滚动加载，保持滚动位置）
    const loadMoreHistoryDataForScroll = async (timestamp) => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      // 【核心修复】防止重复请求：如果已经有正在进行的请求，直接返回
      if (loadingHistory.value || loadingHistoryPromise) {
        // 如果有正在进行的请求，等待它完成
        if (loadingHistoryPromise) {
          try {
            await loadingHistoryPromise
          } catch (e) {
          }
        }
        return
      }

      if (!hasMoreHistory.value) {
        // 如果没有更多数据，通知图表
        if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
          chartRef.value.noMoreData()
        }
        return
      }

      // 立即设置加载状态和创建 Promise，防止并发请求
      loadingHistory.value = true
      loadingHistoryPromise = (async () => {
        // 强制触发更新
        await nextTick()

        try {
        // timestamp 是毫秒时间戳，转换为秒级用于 API
        const beforeTime = Math.floor(timestamp / 1000)

        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 500,
            before_time: beforeTime // 获取此时间之前的数据
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data)) {
          const newData = formatKlineData(response.data)

          if (newData.length === 0) {
            // 没有更多数据了
            hasMoreHistory.value = false
            if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
              chartRef.value.noMoreData()
            }
            return
          }

          // 确保新数据的时间早于传入的时间戳
          const filteredNewData = newData.filter(item => item.timestamp < timestamp)

          if (filteredNewData.length === 0) {
            // 没有更早的数据了
            hasMoreHistory.value = false
            if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
              chartRef.value.noMoreData()
            }
            return
          }

          // 保存当前可见范围，用于恢复滚动位置
          // klinecharts 9.x 的 getVisibleRange() 返回的 from/to 是数据索引（整数），不是百分比
          let savedVisibleRange = null
          try {
            if (chartRef.value && typeof chartRef.value.getVisibleRange === 'function') {
              savedVisibleRange = chartRef.value.getVisibleRange()
            }
          } catch (e) {
          }

          // 记录新数据的数量，用于后续计算偏移
          const newDataCount = filteredNewData.length

          // 将新数据插入到现有数据的前面
          klineData.value = [...filteredNewData, ...klineData.value]

          // 使用 applyNewData 添加历史数据（applyMoreData 在 v9.8.0 已废弃）
          nextTick(() => {
            if (chartRef.value) {
              // 应用新数据
              chartRef.value.applyNewData(klineData.value)

              // 恢复滚动位置
              // 由于新数据插入到了前面，原来的索引需要偏移 newDataCount
              if (savedVisibleRange && typeof savedVisibleRange.from === 'number') {
                // 计算新的可见范围索引
                // 原来看的是索引 from 到 to 的数据，现在这些数据的索引变成了 from + newDataCount 到 to + newDataCount
                const newFrom = savedVisibleRange.from + newDataCount
                const newTo = savedVisibleRange.to + newDataCount

                // 使用 setTimeout 确保数据已经渲染完成
                setTimeout(() => {
                  try {
                    if (chartRef.value) {
                      // 尝试使用 scrollToDataIndex 方法（如果存在）
                      if (typeof chartRef.value.scrollToDataIndex === 'function') {
                        chartRef.value.scrollToDataIndex(newFrom)
                      } else if (typeof chartRef.value.setVisibleRange === 'function') {
                        // 使用 setVisibleRange 设置可见范围（参数是数据索引）
                        chartRef.value.setVisibleRange(newFrom, newTo)
                      }
                    }
                  } catch (e) {
                  }
                }, 50)
              }

              // 更新指标
              updateIndicators()
            }
          })
        } else {
          // API返回错误，通知图表加载失败
          if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        }
        } catch (err) {
          // 加载失败，通知图表
          if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        } finally {
          loadingHistory.value = false
          loadingHistoryPromise = null // 清除请求追踪
        }
      })() // 立即执行 Promise

      // 等待请求完成
      try {
        await loadingHistoryPromise
      } catch (err) {
        // 错误已经在内部的 catch 中处理，这里只是确保 Promise 完成
      }
    }

    // 加载更多历史数据（保留原有函数，用于其他场景）
    const loadMoreHistoryData = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      if (loadingHistory.value || !hasMoreHistory.value) {
        return
      }

      loadingHistory.value = true

      try {
        // 获取当前最早的数据时间（转换为秒级用于 API）
        const earliestTimestamp = klineData.value[0].timestamp
        const earliestTime = Math.floor(earliestTimestamp / 1000) // 转换为秒级
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 500,
            before_time: earliestTime // 获取此时间之前的数据
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data)) {
          const newData = formatKlineData(response.data)

          if (newData.length === 0) {
            // 没有更多数据了
            hasMoreHistory.value = false
            loadingHistory.value = false
            return
          }

          // 确保新数据的时间早于现有最早数据
          const filteredNewData = newData.filter(item => item.timestamp < earliestTimestamp)

          if (filteredNewData.length === 0) {
            // 没有更早的数据了
            hasMoreHistory.value = false
            loadingHistory.value = false
            return
          }

          // 将新数据插入到现有数据的前面
          klineData.value = [...filteredNewData, ...klineData.value]

          // 更新图表
          nextTick(() => {
            if (chartRef.value) {
              chartRef.value.applyNewData(klineData.value)
              updateIndicators()
            }
          })
        } else {
          // API返回错误，但不一定表示没有更多数据，可能是网络问题
          // 不设置 hasMoreHistory = false，允许用户重试
        }
      } catch (err) {
        // 加载失败可能是网络问题，不应该立即认为没有更多数据
        // 只有在明确知道没有更早数据时才设置 hasMoreHistory = false
        // 这里不设置，允许用户重试
      } finally {
        loadingHistory.value = false
      }
    }

    // 增量更新K线数据（实时更新）
    const updateKlineRealtime = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return // 如果没有现有数据，不进行增量更新
      }
      if (realtimeFetchInFlight.value) {
        return
      }
      realtimeFetchInFlight.value = true

      try {
        // 只获取最新的5根K线用于更新
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 5 // 只获取最新5根
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const newData = formatKlineData(response.data)
          const existingData = [...klineData.value]

          if (newData.length > 0) {
            const lastNewTime = Math.floor(newData[newData.length - 1].timestamp / 1000) // 转回秒级用于比较
            const lastExistingTime = Math.floor(existingData[existingData.length - 1].timestamp / 1000)

            // 判断是否属于同一时间段
            if (isSameTimeframe(lastNewTime, lastExistingTime, props.timeframe)) {
              // 同一时间段，合并更新最后一根K线的数据
              // K线合并规则：
              // - open: 保持不变（时间段开始时的价格）
              // - high: 取最大值（时间段内的最高价）
              // - low: 取最小值（时间段内的最低价）
              // - close: 更新为最新价格（当前价格）
              // - volume: 使用API返回的最新值（API返回的已是该周期的总成交量，无需累加）
              const existingLast = existingData[existingData.length - 1]
              const newLast = newData[newData.length - 1]

              const mergedLast = {
                timestamp: existingLast.timestamp, // 保持原有时间戳（毫秒）
                open: existingLast.open, // 开盘价保持不变
                high: Math.max(existingLast.high, newLast.high), // 最高价取最大值
                low: Math.min(existingLast.low, newLast.low), // 最低价取最小值
                close: newLast.close, // 收盘价更新为最新价格
                volume: newLast.volume // 成交量使用API返回的最新值（已是该周期的总成交量）
              }
              // 与当前最后一根在显示精度下无变化则跳过（减少无意义重绘与父组件刷新）
              if (klineBarSnapshotKey(mergedLast) === klineBarSnapshotKey(existingLast)) {
                return
              }
              existingData[existingData.length - 1] = mergedLast
              klineData.value = existingData

              // 更新价格面板（使用内部格式；实时路径节流 emit）
              const internalData = convertToInternalFormat(klineData.value)
              updatePricePanel(internalData)

              // 合并到下一帧再 updateData，避免同一宏任务内多次改动与库内部重入
              const last = existingData[existingData.length - 1]
              const bar = {
                timestamp: last.timestamp,
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                volume: last.volume != null ? last.volume : 0
              }
              if (chartRef.value && typeof chartRef.value.updateData === 'function') {
                scheduleRealtimeChartBarUpdate(bar)
              } else if (chartRef.value) {
                try {
                  chartRef.value.applyNewData(klineData.value)
                } catch (_) {}
              }
            } else if (lastNewTime > lastExistingTime) {
              // 新的时间段，追加新数据
              // 先移除可能重复的K线（基于时间段，而不是精确时间戳）
              const uniqueNewData = newData.filter(newItem => {
                const newItemTime = Math.floor(newItem.timestamp / 1000)
                // 检查是否与现有数据中的任何一条属于同一时间段
                return !existingData.some(existingItem => {
                  const existingItemTime = Math.floor(existingItem.timestamp / 1000)
                  return isSameTimeframe(newItemTime, existingItemTime, props.timeframe)
                })
              })

              if (uniqueNewData.length > 0) {
                klineData.value = [...existingData, ...uniqueNewData]
                // 如果数据超过限制，保留最新的数据
                if (klineData.value.length > 500) {
                  klineData.value = klineData.value.slice(-500)
                }

                // 更新价格面板（使用内部格式）
                const internalData = convertToInternalFormat(klineData.value)
                updatePricePanel(internalData, { force: true })

                // 更新 KLineChart - 使用 applyMoreData 保持滚动位置
                if (chartRef.value && typeof chartRef.value.applyMoreData === 'function') {
                  // 追加新K线，使用 applyMoreData 保持滚动位置
                  chartRef.value.applyMoreData(uniqueNewData)
                  // 新K线出现时强制刷新一次指标
                  maybeUpdateIndicators(true)
                } else if (chartRef.value) {
                  // 降级方案：使用 applyNewData（会重置滚动位置）
                  chartRef.value.applyNewData(klineData.value)
                  maybeUpdateIndicators(true)
                }
              }
            }
            // 如果新数据的时间更早，说明没有更新，保持原数据不变
          }
        }
      } catch (err) {
        // 增量更新失败时静默处理，不影响现有数据
      } finally {
        realtimeFetchInFlight.value = false
      }
    }

    // ── REST 轮询（非加密市场 / WS 断连临时回退） ──
    const startRestPolling = () => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
      }
      const intervalMap = {
        '1m': 5000,
        '5m': 10000,
        '15m': 15000,
        '30m': 30000,
        '1H': 60000,
        '4H': 300000,
        '1D': 600000,
        '1W': 1800000
      }
      const base = intervalMap[props.timeframe] || 10000
      realtimeInterval.value = Math.min(Math.max(base, 2000), 15000)

      if (props.realtimeEnabled && props.symbol && klineData.value.length > 0) {
        realtimeTimer.value = setInterval(() => {
          if (!loading.value && props.symbol && klineData.value && klineData.value.length > 0) {
            updateKlineRealtime()
          }
        }, realtimeInterval.value)
      }
    }

    const stopRestPolling = () => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
        realtimeTimer.value = null
      }
    }

    // ── WebSocket 实时推送处理（高性能路径） ──

    // 待刷新的最新 bar 缓存：WS tick 高频到达时只保留最新值，由 rAF 合并刷新
    let pendingWsBar = null
    let wsTickRafId = null

    const flushWsTick = () => {
      wsTickRafId = null
      if (!wsActive.value) { pendingWsBar = null; return }
      const bar = pendingWsBar
      if (!bar || !chartRef.value) return
      pendingWsBar = null
      scheduleRealtimeChartBarUpdate(bar)
    }

    const handleWsTick = (bar) => {
      // WS 关闭前可能还有残留消息，确认 wsActive 才处理
      if (!wsActive.value) return
      const arr = klineData.value
      if (!arr || arr.length === 0) return

      const lastBar = arr[arr.length - 1]

      if (bar.timestamp === lastBar.timestamp) {
        // 同一根K线内更新：原地修改最后一个元素，避免整个数组拷贝
        const newHigh = Math.max(lastBar.high, bar.high)
        const newLow = Math.min(lastBar.low, bar.low)
        if (lastBar.close === bar.close &&
            lastBar.high === newHigh &&
            lastBar.low === newLow &&
            lastBar.volume === bar.volume) {
          return // 数值无变化，跳过
        }
        const merged = {
          timestamp: lastBar.timestamp,
          open: lastBar.open,
          high: newHigh,
          low: newLow,
          close: bar.close,
          volume: bar.volume
        }
        arr[arr.length - 1] = merged
        // shallowRef 需要赋值新引用触发响应式；slice 只创建浅拷贝引用数组，不拷贝对象
        klineData.value = arr.slice()

        // 直接用最后两根算价格，避免 convertToInternalFormat 遍历全部 500 根
        updatePricePanelFromLastBars(arr)

        // 合并到 rAF 再刷新图表（如果 WS tick 1秒来多次，只刷最后一次）
        pendingWsBar = merged
        if (wsTickRafId == null) {
          wsTickRafId = requestAnimationFrame(flushWsTick)
        }
      } else if (bar.timestamp > lastBar.timestamp) {
        // 新K线诞生
        arr.push(bar)
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500)
        }
        klineData.value = arr.slice()

        updatePricePanelFromLastBars(arr, true)

        if (chartRef.value && typeof chartRef.value.applyMoreData === 'function') {
          chartRef.value.applyMoreData([bar])
        } else if (chartRef.value) {
          chartRef.value.applyNewData(klineData.value)
        }
        // 新K线产生时立即刷新指标
        maybeUpdateIndicators(true)
      }
    }

    const handleWsNewBar = (_bar) => {
      // newBar 信号在 handleWsTick 的 timestamp 分支中已触发 maybeUpdateIndicators
      // 此回调保留作为语义钩子，不再重复触发
    }

    /** 精简版价格面板更新：只用最后两根 bar，不遍历全量数据 */
    const updatePricePanelFromLastBars = (arr, force) => {
      if (!arr || arr.length === 0) return
      const last = arr[arr.length - 1]
      let payload, sig
      if (arr.length > 1) {
        const prev = arr[arr.length - 2]
        const price = formatPrice(last.close)
        const change = ((last.close - prev.close) / prev.close) * 100
        sig = `${price}|${change.toFixed(3)}`
        payload = { price, change }
      } else {
        const price = formatPrice(last.close)
        sig = `${price}|0`
        payload = { price, change: 0 }
      }
      if (!force && sig === lastPriceEmitSig.value) return
      lastPriceEmitSig.value = sig
      emit('price-change', payload)
    }

    // ── WS 断连/重连回调 ──
    const handleWsReconnecting = () => {
      // WS 断开但正在重连 → 临时启动 REST 轮询保持数据流
      startRestPolling()
    }

    const handleWsReconnected = () => {
      // WS 恢复 → 立即停止 REST 轮询，避免冗余 HTTP 请求
      stopRestPolling()
    }

    const handleWsError = () => {
      wsActive.value = false
      startRestPolling()
    }

    const isCryptoMarket = () => {
      const m = (props.market || '').toLowerCase()
      return m === 'crypto' || m === '' || m === 'cryptocurrency'
    }

    const _fetchExchangeId = async () => {
      const now = Date.now()
      if (_cachedExchangeId && (now - _exchangeIdTs) < 300000) return _cachedExchangeId
      try {
        const res = await request({ url: '/api/settings/public-config', method: 'get' })
        if (res && res.data && res.data.ccxt_default_exchange) {
          _cachedExchangeId = res.data.ccxt_default_exchange
          _exchangeIdTs = now
        }
      } catch (_) { /* keep cached or null */ }
      return _cachedExchangeId || 'binance'
    }

    // 启动实时更新
    const startRealtime = async () => {
      stopRealtime()
      const gen = ++_realtimeGeneration

      if (!props.realtimeEnabled || !props.symbol || klineData.value.length === 0) return

      if (isCryptoMarket()) {
        try {
          const exchangeId = await _fetchExchangeId()
          if (gen !== _realtimeGeneration) return
          if (!wsClient) {
            wsClient = new ExchangeKlineWs()
          }
          wsClient.connect(props.symbol, props.timeframe, {
            onTick: handleWsTick,
            onNewBar: handleWsNewBar,
            onError: handleWsError,
            onReconnecting: handleWsReconnecting,
            onReconnected: handleWsReconnected
          }, exchangeId)
          wsActive.value = true
        } catch (_) {
          if (gen !== _realtimeGeneration) return
          wsActive.value = false
          startRestPolling()
        }
      } else {
        startRestPolling()
      }
    }

    // 停止实时更新
    const stopRealtime = () => {
      stopRestPolling()
      if (wsTickRafId != null) {
        cancelAnimationFrame(wsTickRafId)
        wsTickRafId = null
      }
      pendingWsBar = null
      if (wsClient) {
        wsClient.disconnect()
      }
      wsActive.value = false
    }

    // --- 图表初始化函数 ---
    const initChart = () => {
      const container = document.getElementById('kline-chart-container')
      if (!container) return

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        let retryCount = 0
        const maxRetries = 10
        const checkAndInit = () => {
          const checkContainer = document.getElementById('kline-chart-container')
          if (checkContainer && checkContainer.clientWidth > 0 && checkContainer.clientHeight > 0) {
            initChart()
          } else if (retryCount < maxRetries) {
            retryCount++
            setTimeout(checkAndInit, 200)
          } else {
            initChart()
          }
        }
        setTimeout(checkAndInit, 200)
        return
      }

      // 如果图表已存在，先销毁
      if (chartRef.value) {
        try {
          chartRef.value.destroy()
        } catch (e) {}
        chartRef.value = null
      }

      try {
        // 初始化 KLineChart
        const container = document.getElementById('kline-chart-container')
        if (!container) {
          throw new Error('容器元素不存在')
        }

        // 尝试使用配置选项初始化，看是否支持内置画线工具栏
        try {
          // 尝试使用第二个参数传入配置选项
          chartRef.value = init(container, {
            drawingBarVisible: true, // 尝试启用内置画线工具栏
            overlay: {
              visible: true
            }
          })
        } catch (e) {
          // 如果不支持配置选项，使用默认初始化
          chartRef.value = init(container)
        }

        // 如果配置选项方式不支持，尝试调用方法启用画线工具栏
        if (chartRef.value && typeof chartRef.value.setDrawingBarVisible === 'function') {
          chartRef.value.setDrawingBarVisible(true)
        } else if (chartRef.value && typeof chartRef.value.setDrawingBar === 'function') {
          chartRef.value.setDrawingBar(true)
        } else if (chartRef.value && typeof chartRef.value.enableDrawing === 'function') {
          chartRef.value.enableDrawing(true)
        }

        if (!chartRef.value) {
          throw new Error('图表初始化失败：无法创建图表实例')
        }

        // 调试：输出图表实例的所有方法，检查是否有画线工具栏相关的方法
        if (chartRef.value) {
          // 检查是否有内置画线工具栏的方法
          if (typeof chartRef.value.setDrawingBarVisible === 'function') {
            chartRef.value.setDrawingBarVisible(true)
          }
          if (typeof chartRef.value.setDrawingBar === 'function') {
            chartRef.value.setDrawingBar(true)
          }
          if (typeof chartRef.value.enableDrawing === 'function') {
            chartRef.value.enableDrawing(true)
          }
        }

        // 设置价格精度（在 applyNewData 之前）
        if (typeof chartRef.value.setPriceVolumePrecision === 'function') {
          chartRef.value.setPriceVolumePrecision(pricePrecision.value, 0)
        }

        // 设置主题样式
        updateChartTheme()
        nextTick(() => _ensureWmLayer())

        // 监听覆盖物创建完成事件，自动退出绘制模式
        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          // 监听覆盖物创建完成事件
          chartRef.value.subscribeAction('onOverlayCreated', (overlay) => {
            // 如果是通过画线工具创建的覆盖物，记录ID并退出绘制模式
            if (activeDrawingTool.value && overlay && overlay.id) {
              // 检查覆盖物名称是否匹配当前激活的工具
              const toolMap = {
                line: 'segment',
                horizontalLine: 'horizontalStraightLine',
                verticalLine: 'verticalStraightLine',
                ray: 'rayLine',
                straightLine: 'straightLine',
                parallelStraightLine: 'parallelStraightLine',
                priceLine: 'priceLine',
                priceChannelLine: 'priceChannelLine',
                fibonacciLine: 'fibonacciLine',
                measure: 'priceRangeMeasure'
              }
              const expectedOverlayName = toolMap[activeDrawingTool.value]

              // 测量工具需要等待第二个点完成，不能在 created 阶段就退出绘制模式
              if (expectedOverlayName === 'priceRangeMeasure') {
                return
              }
              // 如果覆盖物名称匹配，或者是通过 overrideOverlay 创建的自定义覆盖物
              if (!overlay.name || overlay.name === expectedOverlayName) {
                addedDrawingOverlayIds.value.push(overlay.id)
                // 重置激活状态
                activeDrawingTool.value = null
                // 退出绘制模式
                try {
                  if (typeof chartRef.value.overrideOverlay === 'function') {
                    chartRef.value.overrideOverlay(null)
                  }
                } catch (e) {
                }
              }
            }
          })

          // 监听覆盖物绘制完成事件（某些版本可能使用此事件）
          if (typeof chartRef.value.subscribeAction === 'function') {
            try {
              chartRef.value.subscribeAction('onOverlayComplete', (overlay) => {
                if (activeDrawingTool.value && overlay && overlay.id) {
                  if (activeDrawingTool.value === 'measure') {
                    const points = overlay.points || []
                    if (points.length < 2 || !points[0] || !points[1]) {
                      return
                    }
                  }
                  addedDrawingOverlayIds.value.push(overlay.id)
                  activeDrawingTool.value = null
                  // 退出绘制模式 - 不调用 overrideOverlay(null)，因为会导致错误
                }
              })
            } catch (e) {
              // 如果 onOverlayComplete 不存在，忽略错误
            }
          }

          // 监听覆盖物移除事件
          chartRef.value.subscribeAction('onOverlayRemoved', (overlayId) => {
            // 从列表中移除
            const index = addedDrawingOverlayIds.value.indexOf(overlayId)
            if (index > -1) {
              addedDrawingOverlayIds.value.splice(index, 1)
            }
          })
        }

        // 使用 subscribeAction 监听可见范围变化，手动触发加载更多
        // 替代 setLoadMoreDataCallback，因为它在某些版本可能不触发
        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          // 保存上一次的可见范围，用于检测是否滚动到最左侧
          let lastVisibleFrom = null
          // 标记是否已经处理过初始化时的可见范围变化
          let initialRangeProcessed = false

          chartRef.value.subscribeAction('onVisibleRangeChange', async (data) => {
            if (data && typeof data.from === 'number') {
              // 如果是初始化时的第一次可见范围变化，只记录，不触发加载
              if (!initialRangeProcessed) {
                lastVisibleFrom = data.from
                initialRangeProcessed = true
                // 延迟标记图表初始化完成，确保初始化完成后再允许触发加载
                setTimeout(() => {
                  chartInitialized.value = true
                }, 1000)
                return
              }

              // 如果图表还未初始化完成，不触发加载
              if (!chartInitialized.value) {
                lastVisibleFrom = data.from
                return
              }

              // 如果正在加载历史数据，且用户尝试继续向左滚动，阻止滚动
              if (loadingHistory.value && data.from <= 0) {
                // 尝试将可见范围保持在第一个数据点之后，防止继续向左
                try {
                  if (chartRef.value && typeof chartRef.value.setVisibleRange === 'function') {
                    const dataLength = klineData.value.length
                    if (dataLength > 0) {
                      // 获取当前可见范围
                      const currentRange = chartRef.value.getVisibleRange()
                      if (currentRange) {
                        // 计算可见的数据条数
                        const visibleCount = Math.ceil((currentRange.to - currentRange.from) * dataLength / 100)
                        // 设置新的可见范围，从第一个数据点开始（索引0对应0%，但我们要稍微向右一点）
                        // 使用百分比：第一个数据点大约是 0%，我们设置为 0.1% 来防止继续向左
                        const minFrom = 0.1
                        const newTo = Math.min(100, minFrom + (visibleCount / dataLength * 100))
                        chartRef.value.setVisibleRange(minFrom, newTo)
                      }
                    }
                  }
                } catch (e) {
                }
                return
              }

              // 当滚动到最左侧（索引接近0或小于等于5）时触发加载
              // 【关键】同时检查 loadingHistory.value 和 loadingHistoryPromise，确保没有正在进行的请求
              if (data.from <= 5 && !loadingHistory.value && !loadingHistoryPromise && hasMoreHistory.value && chartInitialized.value) {
                // 两种情况都应触发：
                // 1. 用户主动向左滚动（lastVisibleFrom > data.from）
                // 2. from 已经在 0 附近但还有更多历史数据（数据量太少导致初始就在最左侧）
                const isScrollingLeft = lastVisibleFrom !== null && lastVisibleFrom > data.from
                const isAlreadyAtEdge = data.from <= 0
                if (isScrollingLeft || isAlreadyAtEdge) {
                  if (klineData.value.length > 0) {
                    const earliestTimestamp = klineData.value[0].timestamp
                    await loadMoreHistoryDataForScroll(earliestTimestamp)
                  }
                }
              }

              // 更新上一次的可见范围
              lastVisibleFrom = data.from
            }
          })
        }

        // 如果有数据，应用数据
        if (klineData.value && klineData.value.length > 0) {
          // 确保数据格式正确
          const validData = klineData.value.filter(item =>
            item.timestamp &&
            !isNaN(item.open) &&
            !isNaN(item.high) &&
            !isNaN(item.low) &&
            !isNaN(item.close)
          )

          if (validData.length > 0) {
            // 使用 applyNewData 初始化
            try {
              chartRef.value.applyNewData(validData)
            } catch (e) {
              // 尝试降级处理
              try {
                chartRef.value.applyNewData(validData)
              } catch (e2) {
              }
            }

            // 创建成交量指标（默认显示）
            try {
              chartRef.value.createIndicator('VOL', false, { height: 100, dragEnabled: true })
            } catch (e) {
            }

            // 延迟更新指标，确保K线先渲染
            nextTick(() => {
              updateIndicators()
            })
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        error.value = proxy.$t('dashboard.indicator.error.chartInitFailed') + ': ' + (error.message || '未知错误')
      }
    }

    const handleResize = () => {
      if (chartRef.value) {
        setTimeout(() => {
          if (chartRef.value) {
            chartRef.value.resize()
          }
        }, 100)
      } else {
        const container = document.getElementById('kline-chart-container')
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          initChart()
        }
      }
    }

    // 更新图表主题
    const updateChartTheme = () => {
      if (!chartRef.value) return

      const theme = themeConfig.value
      const isDark = chartTheme.value === 'dark'

      chartRef.value.setStyles({
        grid: {
          show: true,
          horizontal: {
            show: true,
            color: theme.gridLineColor,
            style: 'dashed',
            size: 1
          },
          vertical: {
            show: false
          }
        },
        candle: {
          priceMark: {
            show: true,
            high: {
              show: true,
              color: theme.axisLabelColor
            },
            low: {
              show: true,
              color: theme.axisLabelColor
            }
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
            labels: [
              proxy.$t('dashboard.indicator.tooltip.time'),
              proxy.$t('dashboard.indicator.tooltip.open'),
              proxy.$t('dashboard.indicator.tooltip.high'),
              proxy.$t('dashboard.indicator.tooltip.low'),
              proxy.$t('dashboard.indicator.tooltip.close'),
              proxy.$t('dashboard.indicator.tooltip.volume')
            ],
            values: (kLineData) => {
              const d = new Date(kLineData.timestamp)
              const p = pricePrecision.value
              return [
                `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`,
                kLineData.open.toFixed(p),
                kLineData.high.toFixed(p),
                kLineData.low.toFixed(p),
                kLineData.close.toFixed(p),
                kLineData.volume.toFixed(0)
              ]
            }
          },
          bar: {
            upColor: isDark ? '#0ecb81' : '#13c2c2',
            downColor: isDark ? '#f6465d' : '#fa541c',
            noChangeColor: theme.borderColor
          },
          // 若使用面积图类型，关闭末端点动画可减少实时跳动观感
          area: {
            point: { animation: false, animationDuration: 0 }
          }
        },
        indicator: {
          tooltip: {
            showRule: 'always',
            showType: 'standard'
          }
        },
        xAxis: {
          show: true,
          axisLine: {
            show: true,
            color: theme.borderColor
          }
        },
        yAxis: {
          show: true,
          axisLine: {
            show: false
          }
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          },
          vertical: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          }
        },
        watermark: {
          show: false
        }
      })
    }

    // --- 注册自定义指标辅助函数 ---
    const registerCustomIndicator = (name, calcFunc, figures, calcParams = [], precision = -1, shouldOverlay = false) => {
      if (precision < 0) precision = pricePrecision.value
      try {
        // KLineChart v9 使用 series: 'price' 来标识主图指标
        const indicatorConfig = {
          name,
          shortName: name, // 添加 shortName
          calc: calcFunc,
          figures,
          calcParams,
          precision,
          series: shouldOverlay ? 'price' : 'normal'
        }

        registerIndicator(indicatorConfig)
        // console.log(`成功注册指标: ${name}, series: ${indicatorConfig.series}`)
        return true
      } catch (err) {
        // 如果已注册，忽略错误
        if (err.message && err.message.includes('already registered')) {
          return true
        }
        return false
      }
    }

    // --- 更新指标（KLineChart 版本） ---
    const updateIndicators = async () => {
      if (indicatorsUpdating.value) {
        return
      }
      // 使用 JSON 序列化/反序列化去除 Vue 2 Observer 的干扰
      if (!chartRef.value || klineData.value.length === 0) {
        return
      }

      indicatorsUpdating.value = true
      try {
      // 1. 移除所有已添加的信号 overlays
      try {
        if (addedSignalOverlayIds.value.length > 0 && chartRef.value) {
          addedSignalOverlayIds.value.forEach(overlayId => {
            try {
              if (typeof chartRef.value.removeOverlay === 'function') {
                chartRef.value.removeOverlay(overlayId)
              } else if (typeof chartRef.value.removeOverlayById === 'function') {
                chartRef.value.removeOverlayById(overlayId)
              }
            } catch (err) {
            }
          })
          // 清空列表
          addedSignalOverlayIds.value = []
        }
      } catch (e) {
      }

      // 2. 移除所有已添加的指标
      try {
        if (addedIndicatorIds.value.length > 0) {
          addedIndicatorIds.value.forEach(info => {
            // info 可以是 { paneId, name } 对象或仅 name 字符串
            const name = typeof info === 'string' ? info : info.name
            const paneId = typeof info === 'string' ? undefined : info.paneId

            // 尝试移除指标
            // KLineChart v9: removeIndicator(paneId, name)
            if (paneId) {
              chartRef.value.removeIndicator(paneId, name)
            } else {
              // 如果没有 paneId，尝试从主图移除
              chartRef.value.removeIndicator('candle_pane', name)
              // 也可以尝试不传 paneId
              chartRef.value.removeIndicator(name)
            }
          })
          // 清空列表
          addedIndicatorIds.value = []
        }
      } catch (e) {
      }

      // 转换数据格式（KLineChart 需要内部格式用于计算）
      const internalData = convertToInternalFormat(klineData.value)
      const mainPaneOverlayFigures = []
      const mainPaneOverlayCalcEntries = []
      const mainPaneOverlaySignatureParts = []
      const addMainPaneOverlayEntry = ({ signature, figures, calc }) => {
        if (signature) {
          mainPaneOverlaySignatureParts.push(String(signature))
        }
        if (Array.isArray(figures) && figures.length) {
          mainPaneOverlayFigures.push(...figures)
        }
        if (typeof calc === 'function') {
          mainPaneOverlayCalcEntries.push(calc)
        }
      }

      // 遍历所有激活的指标
      for (let idx = 0; idx < props.activeIndicators.length; idx++) {
        const indicator = props.activeIndicators[idx]
        try {
          if (indicator && indicator.visible === false) {
            continue
          }
          // 处理 Python 指标
          if (indicator.type === 'python') {
            if (!indicator.code) continue

            try {
              // 如果有 calculate 函数，使用它（用于 Python 指标）
              if (indicator.calculate && typeof indicator.calculate === 'function') {
                const result = await indicator.calculate(internalData, indicator.params || {})

                // 处理结果中的 plots - 将所有 plots 合并到一个指标中
                // 注意：signals 不添加到指标中，而是单独处理，避免显示 "n/a"
                let allPlots = []
                if (result && result.plots && Array.isArray(result.plots)) {
                  allPlots = [...result.plots]
                }

                // 处理 signals - 使用 KLineChart 的 createOverlay 显示（不添加到指标中）
                if (result && result.signals && Array.isArray(result.signals)) {
                  for (const signal of result.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      // 统计非空值的数量
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      // 找到所有非空的信号点
                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          // 【核心修改】获取当前 K 线的 High 和 Low
                          // 注意：internalData 已经是你转换过的格式，直接取即可
                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          // Buy-side labels are shown below candles; sell-side labels above candles.
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            // 确定锚点价格：买入看 Low，卖出看 High
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            // side is used for layout/styling; action preserves the original type (buy/sell).
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      // 使用 KLineChart 的 createOverlay 添加标记
                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            // 确保时间戳是毫秒级
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            // 只显示 buy 或 sell，不显示金额
                            const displaySimpleText = point.text

                            // === 使用自定义 signalTag ===
                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                // 【核心修改】传入两个点：
                                // Point 0: 信号触发价格 (用于画圆点)
                                // Point 1: K线极值价格 (用于定位标签)
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // 锁定防止拖动
                              }, 'candle_pane') // 绘制在主图

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                            // === 修改结束 ===
                          } catch (overlayErr) {
                          }
                        }
                      } else {
                      }
                    }
                  }
                }

                // 只处理 plots（不包括 signals）
                if (allPlots.length > 0) {
                  // 过滤出有效的 plots
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    // 构建 figures 数组，包含所有 plots
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}_${idx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      // 对于普通 plot，使用原类型或 'line'
                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    // 确定是否叠加在主图上（如果所有 plots 都是 overlay，则叠加）
                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    // const customIndicatorName = `${indicator.id}_combined`
                    let customIndicatorName = `${indicator.id}_combined`
                    if (result && result.name) {
                      customIndicatorName = result.name
                    }
                    try {
                      // 注册合并的自定义指标
                      const registered = registerCustomIndicator(
                        customIndicatorName,
                        (kLineDataList) => {
                          const result = []
                          for (let i = 0; i < kLineDataList.length; i++) {
                            const dataPoint = {}
                            for (const figureKey in plotDataMap) {
                              const plotData = plotDataMap[figureKey]
                              dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                            }
                            result.push(dataPoint)
                          }
                          return result
                        },
                        figures,
                        [],
                        2,
                        allOverlay
                      )

                      if (registered) {
                        if (allOverlay) {
                          // 主图指标
                          const paneId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { id: 'candle_pane' }
                          )
                          if (paneId) {
                            addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                          } else {
                            addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                          }
                        } else {
                          // 副图指标
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              } else {
                // 如果没有 calculate 函数，直接使用 executePythonStrategy
                // 构建解密所需的信息
                const decryptInfo = {
                  id: indicator.originalId || indicator.id, // 优先使用原始数据库ID
                  user_id: indicator.user_id || indicator.userId,
                  is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0
                }
                const pythonResult = await executePythonStrategy(
                  indicator.code,
                  internalData,
                  indicator.params || {},
                  decryptInfo // 传递解密信息
                )

                // 处理 plots - 将所有 plots 合并到一个指标中
                // 注意：signals 不添加到指标中，而是单独处理，避免显示 "n/a"
                let allPlots = []
                if (pythonResult && pythonResult.plots && Array.isArray(pythonResult.plots)) {
                  allPlots = [...pythonResult.plots]
                }

                // 处理 signals - 使用 KLineChart 的 createOverlay 显示（不添加到指标中）
                if (pythonResult && pythonResult.signals && Array.isArray(pythonResult.signals)) {
                  for (const signal of pythonResult.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      // 统计非空值的数量
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      // 找到所有非空的信号点
                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          // 【核心修改】获取当前 K 线的 High 和 Low
                          // 注意：internalData 已经是你转换过的格式，直接取即可
                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            // 确定锚点价格：买入看 Low，卖出看 High
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      // 使用 KLineChart 的 createOverlay 添加标记
                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            // 确保时间戳是毫秒级
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            // 只显示 buy 或 sell，不显示金额
                            const displaySimpleText = point.text

                            // === 使用自定义 signalTag ===
                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                // 【核心修改】传入两个点：
                                // Point 0: 信号触发价格 (用于画圆点)
                                // Point 1: K线极值价格 (用于定位标签)
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // 锁定防止拖动
                              }, 'candle_pane') // 绘制在主图

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                            // === 修改结束 ===
                          } catch (overlayErr) {
                          }
                        }
                      } else {
                      }
                    }
                  }
                }

                // 只处理 plots（不包括 signals）
                if (allPlots.length > 0) {
                  // 过滤出有效的 plots
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    // 构建 figures 数组，包含所有 plots
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      // 对于普通 plot，使用原类型或 'line'
                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    // 确定是否叠加在主图上（如果所有 plots 都是 overlay，则叠加）
                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    // const customIndicatorName = `${indicator.id}_combined`
                    let customIndicatorName = `${indicator.id}_combined`
                    if (pythonResult && pythonResult.name) {
                      customIndicatorName = pythonResult.name
                    }

                    try {
                      if (allOverlay) {
                        addMainPaneOverlayEntry({
                          signature: `${customIndicatorName}_${idx}`,
                          figures,
                          calc: () => {
                            const result = []
                            for (let i = 0; i < internalData.length; i++) {
                              const dataPoint = {}
                              for (const figureKey in plotDataMap) {
                                const plotData = plotDataMap[figureKey]
                                dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                              }
                              result.push(dataPoint)
                            }
                            return result
                          }
                        })
                      } else {
                        // 注册合并的自定义指标
                        const registered = registerCustomIndicator(
                          customIndicatorName,
                          (kLineDataList) => {
                            const result = []
                            for (let i = 0; i < kLineDataList.length; i++) {
                              const dataPoint = {}
                              for (const figureKey in plotDataMap) {
                                const plotData = plotDataMap[figureKey]
                                dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                              }
                              result.push(dataPoint)
                            }
                            return result
                          },
                          figures,
                          [],
                          2,
                          false
                        )

                        if (registered) {
                          // 副图指标
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              }
            } catch (err) {
              // 如果是 Python 引擎未就绪的错误，设置加载失败状态
              if (err.message && err.message.includes('Python 引擎未就绪')) {
                if (!loadingPython.value) {
                  pyodideLoadFailed.value = true
                }
              }
            }
            continue
          }

          // 注意：calculate 函数可能为 null，因为指标的计算逻辑在 updateIndicators 中通过 id 判断
          // 所以这里不检查 calculate，而是直接根据 indicator.id 处理

          const indicatorStyle = normalizeIndicatorStyle(indicator.style || {}, getIndicatorColor(idx))
          const color = indicatorStyle.color
          const lineWidth = indicatorStyle.lineWidth
          const indicatorInstanceKey = String(indicator.instanceId || `${indicator.id}_${idx}`).replace(/[^a-zA-Z0-9_]/g, '_')
          const buildUniqueIndicatorName = (baseName) => `${baseName}_${indicatorInstanceKey}`
          const buildLineFigure = (key, title, figureColor = color, width = lineWidth) => ({
            key,
            title,
            type: 'line',
            color: figureColor,
            styles: () => ({
              color: figureColor,
              size: width,
              style: 'solid'
            })
          })
          const buildBarFigure = (key, title, figureColor = color) => ({
            key,
            title,
            type: 'bar',
            color: figureColor,
            styles: () => ({
              color: figureColor
            })
          })

          // 根据指标类型创建 KLineChart 指标
          if (indicator.id === 'sma' || indicator.id === 'ema') {
            const maType = indicator.id === 'sma' ? 'SMA' : 'EMA'
            const period = indicator.params?.length || indicator.params?.period || 20
            const figureKey = maType.toLowerCase()
            const calcPeriod = period

            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`${maType}_${period}`),
                figures: [buildLineFigure(`${figureKey}_${indicatorInstanceKey}`, `${maType}(${period})`, color, lineWidth)],
                calc: (kLineDataList) => {
                  const p = calcPeriod
                  // calculateSMA/EMA 需要传入包含 close 属性的对象数组，而不是数字数组
                  const values = maType === 'SMA'
                    ? calculateSMA(kLineDataList, p)
                    : calculateEMA(kLineDataList, p)
                  return values.map(v => ({ [`${figureKey}_${indicatorInstanceKey}`]: v }))
                }
              })
            } catch (err) {
            }
          } else if (indicator.id === 'macd') {
            const fast = indicator.params?.fast || 12
            const slow = indicator.params?.slow || 26
            const signal = indicator.params?.signal || 9
            const customIndicatorName = buildUniqueIndicatorName(`MACD_${fast}_${slow}_${signal}`)
            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const fast = indicator.calcParams[0] || 12
                  const slow = indicator.calcParams[1] || 26
                  const signal = indicator.calcParams[2] || 9
                  const macdValues = calculateMACD(kLineDataList, fast, slow, signal)
                  return macdValues.macd.map((value, i) => ({
                    macd: value,
                    signal: macdValues.signal[i],
                    histogram: macdValues.histogram[i]
                  }))
                },
                [
                  buildLineFigure('macd', `MACD(${fast},${slow})`, color, lineWidth),
                  buildLineFigure('signal', `SIGNAL(${signal})`, '#fa8c16', lineWidth),
                  buildBarFigure('histogram', 'HIST', '#722ed1')
                ],
                [fast, slow, signal]
              )
              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'rsi') {
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`RSI_${length}`)
            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const rsiValues = calculateRSI(kLineDataList, length)
                  return rsiValues.map(value => ({ rsi: value }))
                },
                [buildLineFigure('rsi', `RSI(${length})`, color, lineWidth)],
                [length]
              )
              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'bollinger_bands' || indicator.id === 'bb') {
            // 布林带需要注册自定义指标
            const length = indicator.params?.length || 20
            const mult = indicator.params?.mult || 2

            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`BOLL_${length}_${mult}`),
                figures: [
                  buildLineFigure(`upper_${indicatorInstanceKey}`, `上轨(${length},${mult})`, color, lineWidth),
                  buildLineFigure(`middle_${indicatorInstanceKey}`, `中轨(${length})`, '#8c8c8c', lineWidth),
                  buildLineFigure(`lower_${indicatorInstanceKey}`, `下轨(${length},${mult})`, color, lineWidth)
                ],
                calc: (kLineDataList) => {
                  const currentLength = length
                  const currentMult = mult
                  // calculateBollingerBands 需要传入包含 close 属性的对象数组
                  const bbResult = calculateBollingerBands(kLineDataList, currentLength, currentMult)
                  // KLineChart 需要返回对象数组，每个对象的键对应 figures 的 key
                  const result = []
                  for (let i = 0; i < bbResult.length; i++) {
                    result.push({
                      [`upper_${indicatorInstanceKey}`]: bbResult[i]?.upper ?? null,
                      [`middle_${indicatorInstanceKey}`]: bbResult[i]?.middle ?? null,
                      [`lower_${indicatorInstanceKey}`]: bbResult[i]?.lower ?? null
                    })
                  }
                  return result
                }
              })
            } catch (err) {
            }
          } else if (indicator.id === 'atr') {
            // ATR 需要注册自定义指标
            const period = indicator.params?.period || indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`ATR_${period}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const atrValues = calculateATR(data, period)
                  // 转换为 KLineChart 需要的格式：返回对象数组
                  return atrValues.map(value => ({ atr: value }))
                },
                [buildLineFigure('atr', `ATR(${period})`, color, lineWidth)],
                [period]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'williams' || indicator.id === 'williams_r') {
            // Williams %R 需要注册自定义指标
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`WPR_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const wrValues = calculateWilliamsR(data, length)
                  // 转换为 KLineChart 需要的格式：返回对象数组
                  return wrValues.map(value => ({ wr: value }))
                },
                [buildLineFigure('wr', `W%R(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'mfi') {
            // MFI 需要注册自定义指标
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`MFI_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume
                  }))
                  const mfiValues = calculateMFI(data, length)
                  // 转换为 KLineChart 需要的格式：返回对象数组
                  return mfiValues.map(value => ({ mfi: value }))
                },
                [buildLineFigure('mfi', `MFI(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'cci') {
            // CCI 需要注册自定义指标
            const length = indicator.params?.length || 20
            const customIndicatorName = buildUniqueIndicatorName(`CCI_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 20
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const cciValues = calculateCCI(data, length)
                  // 转换为 KLineChart 需要的格式：返回对象数组
                  return cciValues.map(value => ({ cci: value }))
                },
                [buildLineFigure('cci', `CCI(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adx') {
            // ADX 需要注册自定义指标
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`ADX_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateADX(data, length)
                  // 转换为 KLineChart 需要的格式：返回对象数组
                  return result.adx.map(value => ({ adx: value }))
                },
                [buildLineFigure('adx', `ADX(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'obv') {
            // OBV 需要注册自定义指标
            const customIndicatorName = buildUniqueIndicatorName('OBV')

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const obvValues = calculateOBV(data)
                  return obvValues.map(value => ({ obv: value }))
                },
                [buildLineFigure('obv', 'OBV', color, lineWidth)],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adosc') {
            // ADOSC 需要注册自定义指标
            const fast = indicator.params?.fast || 3
            const slow = indicator.params?.slow || 10
            const customIndicatorName = buildUniqueIndicatorName(`ADOSC_${fast}_${slow}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const fast = indicator.calcParams[0] || 3
                  const slow = indicator.calcParams[1] || 10
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adoscValues = calculateADOSC(data, fast, slow)
                  return adoscValues.map(value => ({ adosc: value }))
                },
                [buildLineFigure('adosc', `ADOSC(${fast},${slow})`, color, lineWidth)],
                [fast, slow]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'ad') {
            // AD 需要注册自定义指标
            const customIndicatorName = buildUniqueIndicatorName('AD')

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adValues = calculateAD(data)
                  return adValues.map(value => ({ ad: value }))
                },
                [buildLineFigure('ad', 'AD', color, lineWidth)],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'kdj') {
            // KDJ 需要注册自定义指标
            const period = indicator.params?.period || 9
            const kPeriod = indicator.params?.k || 3
            const dPeriod = indicator.params?.d || 3
            const customIndicatorName = buildUniqueIndicatorName(`KDJ_${period}_${kPeriod}_${dPeriod}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 9
                  const kPeriod = indicator.calcParams[1] || 3
                  const dPeriod = indicator.calcParams[2] || 3
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateKDJ(data, period, kPeriod, dPeriod)
                  return result.k.map((k, i) => ({
                    k: k,
                    d: result.d[i],
                    j: result.j[i]
                  }))
                },
                [
                  buildLineFigure('k', `K(${period},${kPeriod})`, color, lineWidth),
                  buildLineFigure('d', `D(${dPeriod})`, '#4ECDC4', lineWidth),
                  buildLineFigure('j', 'J', '#95E1D3', lineWidth)
                ],
                [period, kPeriod, dPeriod]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else {
            // 尝试直接用 indicator.id 创建（假设是内置指标名）
            try {
              const indicatorName = indicator.id.toUpperCase()
              const indicatorId = chartRef.value.createIndicator(indicatorName, false, { height: 100, dragEnabled: true })
              if (indicatorId) {
                addedIndicatorIds.value.push({ paneId: indicatorId, name: indicatorName })
              }
            } catch (err) {
            }
          }
          // ... 其他指标 ...
        } catch (e) {
        }
      }
      if (mainPaneOverlayFigures.length > 0) {
        try {
          const combinedName = `QD_MAIN_OVERLAY_${mainPaneOverlaySignatureParts.join('_').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 120)}`
          const registered = registerCustomIndicator(
            combinedName,
            (kLineDataList) => {
              const mergedResults = Array.from({ length: kLineDataList.length }, () => ({}))
              mainPaneOverlayCalcEntries.forEach(calc => {
                const partial = calc(kLineDataList) || []
                for (let i = 0; i < mergedResults.length; i++) {
                  if (partial[i] && typeof partial[i] === 'object') {
                    Object.assign(mergedResults[i], partial[i])
                  }
                }
              })
              return mergedResults
            },
            mainPaneOverlayFigures,
            [],
            -1,
            true
          )
          if (registered) {
            const paneId = chartRef.value.createIndicator(combinedName, true, { id: 'candle_pane' })
            if (paneId) {
              addedIndicatorIds.value.push({ paneId, name: combinedName })
            } else {
              addedIndicatorIds.value.push({ paneId: 'candle_pane', name: combinedName })
            }
          }
        } catch (e) {
        }
      }
      } finally {
        indicatorsUpdating.value = false
      }
    }

    const handleRetry = () => {
      loadKlineData()
    }

    // 生命周期
    watch(() => props.symbol, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })
    watch(() => props.theme, (newTheme) => {
      chartTheme.value = newTheme
      if (chartRef.value) {
        updateChartTheme()
        updateIndicators()
      }
      nextTick(() => _ensureWmLayer())
    })

    watch(() => props.market, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.timeframe, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.activeIndicators, (newVal, oldVal) => {
      // 当指标列表变化时，重新渲染图表
      if (chartRef.value && klineData.value.length > 0) {
        // 使用 nextTick 确保 DOM 更新完成后再更新图表
        nextTick(() => {
          if (chartRef.value) {
            updateIndicators()
          }
        })
      }
      if (indicatorEditorVisible.value && indicatorEditorTargetId.value) {
        const current = (newVal || []).find(item => item && (item.instanceId || item.id) === indicatorEditorTargetId.value)
        if (!current) {
          closeIndicatorEditor()
        }
      }
    }, { deep: true })

    watch(() => props.realtimeEnabled, (newVal) => {
      if (newVal) {
        startRealtime()
      } else {
        stopRealtime()
      }
    })

    onMounted(async () => {
      // 优先使用 props.theme（从 Vuex store 获取），确保与系统主题同步
      // 使用 nextTick 确保 props 已经正确传递
      await nextTick()
      if (props.theme && (props.theme === 'dark' || props.theme === 'light')) {
        chartTheme.value = props.theme
      }

      // 加载 Pyodide
      try {
        await loadPyodide()
      } catch (err) {
        pyodideLoadFailed.value = true
      }

      nextTick(() => {
        setTimeout(() => {
          if (!chartRef.value && props.symbol) {
            initChart()
          }
        }, 300)
      })

      nextTick(() => {
        const el = document.getElementById('kline-chart-container')
        if (!el || typeof ResizeObserver === 'undefined') return
        chartResizeObserver = new ResizeObserver(() => {
          if (chartResizeRafId != null) cancelAnimationFrame(chartResizeRafId)
          chartResizeRafId = requestAnimationFrame(() => {
            chartResizeRafId = null
            if (chartRef.value && typeof chartRef.value.resize === 'function') {
              chartRef.value.resize()
            } else {
              const c = document.getElementById('kline-chart-container')
              if (c && c.clientWidth > 0 && c.clientHeight > 0) {
                initChart()
              }
            }
            _ensureWmLayer()
          })
        })
        chartResizeObserver.observe(el)
      })

      nextTick(() => {
        _ensureWmLayer()
        _startWmGuard()
      })
    })

    // ── Watermark (multi-layer, tamper-resistant) ──
    const _wmText = [81, 117, 97, 110, 116, 68, 105, 110, 103, 101, 114].map(c => String.fromCharCode(c)).join('')
    const _wmSub = [113, 117, 97, 110, 116, 100, 105, 110, 103, 101, 114, 46, 99, 111, 109].map(c => String.fromCharCode(c)).join('')

    const _paintWmCanvas = () => {
      const cvs = wmCanvasRef.value
      if (!cvs) return
      const parent = cvs.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (w === 0 || h === 0) return
      const dpr = window.devicePixelRatio || 1
      cvs.width = w * dpr
      cvs.height = h * dpr
      cvs.style.width = w + 'px'
      cvs.style.height = h + 'px'
      const ctx = cvs.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.save()
      ctx.scale(dpr, dpr)
      const isDark = chartTheme.value === 'dark'
      // main brand
      ctx.font = 'bold 18px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
      ctx.textBaseline = 'bottom'
      ctx.fillText(_wmText, 12, h - 24)
      // sub domain
      ctx.font = '11px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'
      ctx.fillText(_wmSub, 12, h - 10)
      // tiled repeat across chart
      ctx.font = '13px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.022)'
      ctx.save()
      ctx.rotate(-0.35)
      for (let y = 0; y < h + 200; y += 140) {
        for (let x = -200; x < w + 200; x += 260) {
          ctx.fillText(_wmText, x, y)
        }
      }
      ctx.restore()
      ctx.restore()
    }

    const _ensureWmLayer = () => {
      const cvs = wmCanvasRef.value
      if (!cvs) return
      // force visibility
      cvs.style.display = 'block'
      cvs.style.opacity = '1'
      cvs.style.visibility = 'visible'
      cvs.style.pointerEvents = 'none'
      _paintWmCanvas()
    }

    const _startWmGuard = () => {
      if (_wmTimer) clearInterval(_wmTimer)
      _wmTimer = setInterval(_ensureWmLayer, 3000)

      if (typeof MutationObserver !== 'undefined' && wmCanvasRef.value) {
        if (_wmObserver) _wmObserver.disconnect()
        _wmObserver = new MutationObserver(() => { _ensureWmLayer() })
        _wmObserver.observe(wmCanvasRef.value, { attributes: true, attributeFilter: ['style', 'class'] })
        const parent = wmCanvasRef.value.parentElement
        if (parent) {
          _wmObserver.observe(parent, { childList: true })
        }
      }
    }

    onBeforeUnmount(() => {
      stopRealtime()
      wsClient = null
      if (realtimeChartRafId != null) {
        cancelAnimationFrame(realtimeChartRafId)
        realtimeChartRafId = null
      }
      if (chartResizeRafId != null) {
        cancelAnimationFrame(chartResizeRafId)
        chartResizeRafId = null
      }
      if (chartResizeObserver) {
        chartResizeObserver.disconnect()
        chartResizeObserver = null
      }
      if (_wmTimer) { clearInterval(_wmTimer); _wmTimer = null }
      if (_wmObserver) { _wmObserver.disconnect(); _wmObserver = null }
      if (chartRef.value) {
        chartRef.value.destroy()
        chartRef.value = null
      }
      window.removeEventListener('resize', handleResize)
    })

    return {
      klineData,
      loading,
      error,
      loadingHistory,
      chartRef,
      chartTheme,
      themeConfig,
      wmCanvasRef,
      getIndicatorColor,
      handleRetry,
      loadingPython,
      pythonReady,
      pyodideLoadFailed,
      formatKlineData,
      updatePricePanel,
      isSameTimeframe,
      loadKlineData,
      loadMoreHistoryData,
      updateKlineRealtime,
      startRealtime,
      stopRealtime,
      initChart,
      handleResize,
      updateChartTheme,
      updateIndicators,
      executePythonStrategy,
      parsePythonStrategy,
      indicatorButtons,
      activePresetIndicators,
      handleIndicatorButtonClick,
      isIndicatorActive,
      toggleIndicator,
      indicatorEditorVisible,
      indicatorEditorSaving,
      indicatorEditorForm,
      indicatorEditorSchema,
      indicatorEditorTitle,
      indicatorEditorModalWrapClass,
      formatIndicatorInstanceLabel,
      openIndicatorEditor,
      closeIndicatorEditor,
      applyIndicatorEditor,
      removeIndicatorInstance,
      toggleIndicatorVisibility,
      drawingTools,
      activeDrawingTool,
      selectDrawingTool,
      clearAllDrawings,
      addedSignalOverlayIds
    }
  }
}
</script>

<style lang="less" scoped>
/* 左侧图表容器 */
.chart-left {
  width: 70% !important;
  flex: 0 0 70% !important;
  position: relative;
  border-right: 1px solid #e8e8e8;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;

  &.theme-dark {
    background: #141414;
    border-right-color: #2a2a2a;
  }
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  display: flex;

  .theme-dark & {
    background: #141414;
  }
}

/* 画线工具工具栏 */
.drawing-toolbar {
  flex-shrink: 0;
  width: 40px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 4px;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-left.theme-dark .drawing-toolbar {
  background: #141414;
  border-right-color: #2a2a2a;
}

.drawing-tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #666;
  font-size: 16px;
  user-select: none;
}

.chart-left.theme-dark .drawing-tool-btn {
  color: #d1d4dc;
}

.drawing-tool-btn:hover {
  background: #f0f2f5;
  color: #1890ff;
}

.chart-left.theme-dark .drawing-tool-btn:hover {
  background: #252525;
  color: #13c2c2;
}

.drawing-tool-btn.active {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.chart-left.theme-dark .drawing-tool-btn.active {
  background: #252525;
  color: #13c2c2;
  border-color: #13c2c2;
}

.drawing-toolbar .ant-divider-vertical {
  margin: 8px 0;
  height: 20px;
}

/* 指标工具栏 */
.indicator-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  z-index: 1;
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.indicator-toolbar::-webkit-scrollbar {
  display: none; /* Chrome Safari */
  width: 0;
  height: 0;
}

.indicator-active-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 12px 10px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.chart-left.theme-dark .indicator-active-bar {
  background: #141414;
  border-bottom-color: #2a2a2a;
}

.indicator-active-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f7faff;
  border: 1px solid #d6e4ff;
  color: #1f1f1f;
  font-size: 12px;
  line-height: 1;
}

.indicator-active-chip--hidden {
  opacity: 0.65;
  background: #fafafa;
  border-color: #d9d9d9;
}

.chart-left.theme-dark .indicator-active-chip {
  background: rgba(24, 144, 255, 0.12);
  border-color: rgba(24, 144, 255, 0.28);
  color: rgba(255, 255, 255, 0.88);
}

.chart-left.theme-dark .indicator-active-chip--hidden {
  background: #1f1f1f;
  border-color: #434343;
  color: rgba(255, 255, 255, 0.55);
}

.indicator-active-chip__label {
  cursor: pointer;
  font-weight: 600;
}

.indicator-active-chip__action {
  cursor: pointer;
  color: #8c8c8c;
  transition: color 0.2s ease;
}

.indicator-active-chip__action:hover {
  color: #1890ff;
}

.chart-left.theme-dark .indicator-active-chip__action {
  color: rgba(255, 255, 255, 0.55);
}

.chart-left.theme-dark .indicator-active-chip__action:hover {
  color: #13c2c2;
}

.indicator-editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.indicator-editor-field__label {
  margin-bottom: 8px;
  color: #262626;
  font-weight: 600;
}

.indicator-editor-field__hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.indicator-editor-color {
  width: 100%;
  height: 36px;
  padding: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.chart-left.theme-dark .indicator-editor-color {
  border-color: #434343;
  background: #1f1f1f;
}

.indicator-editor-empty {
  color: #8c8c8c;
}

/deep/ .indicator-editor-modal--dark .ant-modal-content {
  background: #1f1f1f;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
}

/deep/ .indicator-editor-modal--dark .ant-modal-header {
  background: #1f1f1f;
  border-bottom: 1px solid #303030;
}

/deep/ .indicator-editor-modal--dark .ant-modal-title {
  color: rgba(255, 255, 255, 0.9);
}

/deep/ .indicator-editor-modal--dark .ant-modal-close {
  color: rgba(255, 255, 255, 0.45);
}

/deep/ .indicator-editor-modal--dark .ant-modal-close:hover {
  color: rgba(255, 255, 255, 0.85);
}

/deep/ .indicator-editor-modal--dark .ant-modal-body {
  background: #1f1f1f;
}

/deep/ .indicator-editor-modal--dark .ant-modal-footer {
  background: #1f1f1f;
  border-top: 1px solid #303030;
}

/deep/ .indicator-editor-modal--dark .ant-input-number {
  background: #141414;
  border-color: #434343;
}

/deep/ .indicator-editor-modal--dark .ant-input-number-input {
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
}

/deep/ .indicator-editor-modal--dark .ant-input-number-handler-wrap {
  background: #141414;
  border-left-color: #303030;
}

/deep/ .indicator-editor-modal--dark .ant-input-number-handler {
  color: rgba(255, 255, 255, 0.45);
}

/deep/ .indicator-editor-modal--dark .ant-input-number:hover,
/deep/ .indicator-editor-modal--dark .ant-input-number-focused {
  border-color: #177ddc;
}

/deep/ .indicator-editor-modal--dark .indicator-editor-field__label {
  color: rgba(255, 255, 255, 0.88);
}

/deep/ .indicator-editor-modal--dark .indicator-editor-field__hint,
/deep/ .indicator-editor-modal--dark .indicator-editor-empty {
  color: rgba(255, 255, 255, 0.45);
}

/deep/ .indicator-editor-modal--dark .indicator-editor-color {
  background: #141414;
  border-color: #434343;
}

/* 图表内容区域 */
.chart-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.qd-wm-layer {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 8 !important;
  pointer-events: none !important;
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.chart-left.theme-dark .indicator-toolbar {
  background: #141414;
  border-bottom-color: #2a2a2a;
}

.indicator-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #f0f2f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
  user-select: none;
}

.chart-left.theme-dark .indicator-btn {
  color: #d1d4dc;
  background: #252525;
  border-color: #2a2a2a;
}

.indicator-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
  background: #f0f8ff;
}

.chart-left.theme-dark .indicator-btn:hover {
  color: #13c2c2;
  border-color: #13c2c2;
  background: #252525;
}

.indicator-btn.active {
  color: #1890ff;
  background: #fff;
  border-color: #1890ff;
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.chart-left.theme-dark .indicator-btn.active {
  color: #13c2c2;
  background: #252525;
  border-color: #13c2c2;
  box-shadow: 0 0 0 2px rgba(19, 194, 194, 0.2);
}

.kline-chart-container {
  flex: 1;
  width: 100%;
  min-width: 0; /* 防止 flex 子元素溢出 */
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  overflow: hidden;

  .theme-dark & {
    background: #141414;
  }
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  backdrop-filter: blur(2px);
}

.chart-left.theme-dark .chart-overlay {
  background: rgba(20, 20, 20, 0.95);
}

.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
}

.initial-hint {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .initial-hint {
  background: rgba(20, 20, 20, 0.98);
}

.hint-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  padding: 20px;
}

.pyodide-warning {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .pyodide-warning {
  background: rgba(20, 20, 20, 0.98);
}

.warning-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 500px;
  padding: 20px;
}

.warning-title {
  font-size: 16px;
  font-weight: 600;
  color: #faad14;
  margin-bottom: 8px;
}

.warning-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.chart-left.theme-dark .warning-box {
  color: #d1d4dc;
}

.chart-left.theme-dark .warning-title {
  color: #faad14;
}

.chart-left.theme-dark .warning-desc {
  color: #868993;
}

.chart-left.theme-dark .hint-box {
  color: #d1d4dc;
}

.hint-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.chart-left.theme-dark .hint-title {
  color: #d1d4dc;
}

.hint-desc {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
}

.chart-left.theme-dark .hint-desc {
  color: #787b86;
}

/* 历史数据加载提示 */
.history-loading-hint {
  position: absolute;
  left: 20px;
  top: 60px;
  z-index: 1000 !important;
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.98) !important;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #666 !important;
  backdrop-filter: blur(4px);
  pointer-events: none;
  visibility: visible !important;
  opacity: 1 !important;
}

.chart-left.theme-dark .history-loading-hint {
  background: rgba(20, 20, 20, 0.98) !important;
  border-color: #2a2a2a;
  color: #d1d4dc !important;
}

.loading-text {
  white-space: nowrap;
  margin-left: 4px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .drawing-toolbar {
    display: none; /* 移动端隐藏画线工具栏 */
  }

  .indicator-toolbar {
    padding-left: 12px; /* 移动端恢复原始padding */
    flex-wrap: nowrap; /* 手机端不换行，只显示一行 */
    overflow-x: auto; /* 允许横向滚动 */
    overflow-y: hidden; /* 禁止纵向滚动 */
    scrollbar-width: none; /* Firefox 隐藏滚动条 */
    -ms-overflow-style: none; /* IE 10+ 隐藏滚动条 */
    -webkit-overflow-scrolling: touch; /* iOS 平滑滚动 */
  }

  .indicator-toolbar::-webkit-scrollbar {
    display: none; /* Chrome Safari 隐藏滚动条 */
    width: 0;
    height: 0;
  }

  .indicator-btn {
    flex-shrink: 0; /* 按钮不收缩，保持原始大小 */
  }
}

@media (max-width: 1200px) {
  .drawing-toolbar {
    display: none; /* 移动端隐藏画线工具栏 */
  }

  .indicator-toolbar {
    padding-left: 12px; /* 移动端恢复原始padding */
  }

  .kline-chart-container {
    margin-left: 0; /* 移动端恢复原始margin */
  }

  .chart-left {
    width: 100% !important;
    min-width: 100% !important;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
    height: 600px !important;
    min-height: 600px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 600px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 600px !important;
  }
}

@media (max-width: 992px) {
  .chart-left {
    height: 650px !important;
    min-height: 650px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 650px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 650px !important;
  }
}

@media (max-width: 768px) {
  .chart-left {
    height: 60vh !important;
    min-height: 400px !important;
    max-height: 80vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 400px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* 减去工具栏高度 */
    min-height: 350px !important;
    max-height: calc(100% - 45px) !important;
  }
}

@media (max-width: 576px) {
  .chart-left {
    height: 55vh !important;
    min-height: 350px !important;
    max-height: 75vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 350px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* 减去工具栏高度 */
    min-height: 300px !important;
    max-height: calc(100% - 45px) !important;
  }
}
</style>
