<template>
  <div class="ai-analysis-container" :class="{ 'theme-dark': isDarkTheme, embedded: embedded }" :style="{ '--primary-color': primaryColor }">
    <!-- 全宽主内容区域 -->
    <div class="main-content-full">
      <!-- 顶部指数条 -->
      <div class="top-index-bar">
        <!-- 情绪指标 - 独立加载 -->
        <template v-if="loadingSentiment">
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
        </template>
        <template v-else>
          <div class="indicator-box fear-greed" :class="getFearGreedClass(marketData.fearGreed)">
            <span class="ind-label">{{ $t('globalMarket.fearGreedShort') }}</span>
            <span class="ind-value">{{ marketData.fearGreed || '--' }}</span>
          </div>
          <div class="indicator-box vix" :class="getVixLevel(marketData.vix)">
            <span class="ind-label">VIX</span>
            <span class="ind-value">{{ marketData.vix || '--' }}</span>
          </div>
          <div class="indicator-box dxy">
            <span class="ind-label">DXY</span>
            <span class="ind-value">{{ marketData.dxy || '--' }}</span>
          </div>
        </template>

        <!-- 全球指数滚动条 - 独立加载 -->
        <div class="indices-marquee">
          <template v-if="loadingIndices">
            <div class="indices-loading">
              <a-icon type="loading" /> {{ $t('common.loading') || '加载中...' }}
            </div>
          </template>
          <template v-else-if="marketData.indices.length > 0">
            <div class="marquee-track">
              <div class="index-item" v-for="idx in marketData.indices" :key="'a-'+idx.symbol">
                <span class="idx-flag">{{ idx.flag }}</span>
                <span class="idx-symbol">{{ idx.symbol }}</span>
                <span class="idx-price">{{ formatPrice(idx.price) }}</span>
                <span class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
                  <a-icon :type="idx.change >= 0 ? 'caret-up' : 'caret-down'" />
                  {{ Math.abs(idx.change).toFixed(2) }}%
                </span>
              </div>
              <div class="index-item" v-for="idx in marketData.indices" :key="'b-'+idx.symbol">
                <span class="idx-flag">{{ idx.flag }}</span>
                <span class="idx-symbol">{{ idx.symbol }}</span>
                <span class="idx-price">{{ formatPrice(idx.price) }}</span>
                <span class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
                  <a-icon :type="idx.change >= 0 ? 'caret-up' : 'caret-down'" />
                  {{ Math.abs(idx.change).toFixed(2) }}%
                </span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="indices-empty">--</div>
          </template>
        </div>
        <a-button type="link" size="small" class="refresh-btn" :loading="loadingMarket" @click="loadMarketData">
          <a-icon type="sync" :spin="loadingMarket" />
        </a-button>
      </div>

      <!-- 主体三栏布局 -->
      <div class="main-body">
        <!-- 左侧：热力图 + 财经日历 -->
        <div class="left-panel">
          <!-- 热力图 - 独立加载 -->
          <div class="heatmap-box">
            <div class="box-header">
              <a-radio-group v-model="heatmapType" size="small" button-style="solid">
                <a-radio-button value="crypto">{{ $t('globalMarket.cryptoHeatmap') }}</a-radio-button>
                <a-radio-button value="commodities">{{ $t('globalMarket.commoditiesHeatmap') }}</a-radio-button>
                <a-radio-button value="sectors">{{ $t('globalMarket.sectorHeatmap') }}</a-radio-button>
                <a-radio-button value="forex">{{ $t('globalMarket.forexHeatmap') }}</a-radio-button>
              </a-radio-group>
            </div>
            <div class="heatmap-grid">
              <template v-if="loadingHeatmap">
                <div v-for="i in 12" :key="'skel-'+i" class="heat-cell skeleton-cell">
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text"></span>
                </div>
              </template>
              <template v-else-if="currentHeatmap.length > 0">
                <div v-for="(item, i) in currentHeatmap.slice(0, 12)" :key="i" class="heat-cell" :style="getHeatmapStyle(item.value)">
                  <span class="heat-name">{{ getHeatmapName(item) }}</span>
                  <span class="heat-price" v-if="item.price">{{ formatHeatmapPrice(item.price) }}</span>
                  <span class="heat-val">{{ item.value >= 0 ? '+' : '' }}{{ formatNum(item.value) }}%</span>
                </div>
              </template>
              <template v-else>
                <div class="heatmap-empty">{{ $t('common.noData') || '暂无数据' }}</div>
              </template>
            </div>
          </div>

          <!-- 财经日历 - 独立加载 -->
          <div class="calendar-box">
            <div class="box-header">
              <span class="box-title"><a-icon type="calendar" /> {{ $t('globalMarket.calendar') }}</span>
            </div>
            <div class="calendar-list">
              <template v-if="loadingCalendar">
                <div v-for="i in 5" :key="'cal-skel-'+i" class="cal-item skeleton-item">
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text"></span>
                </div>
              </template>
              <template v-else-if="marketData.calendar.length > 0">
                <div v-for="evt in marketData.calendar.slice(0, 10)" :key="evt.id" class="cal-item" :class="evt.importance">
                  <span class="cal-date">{{ formatCalendarDate(evt.date) }}</span>
                  <span class="cal-time">{{ evt.time || '--:--' }}</span>
                  <span class="cal-flag">{{ getCountryFlag(evt.country) }}</span>
                  <span class="cal-name">{{ isZhLocale ? evt.name : evt.name_en }}</span>
                  <span class="cal-impact" :class="getImpactClass(evt)">
                    <a-icon v-if="getImpactClass(evt) === 'bullish'" type="arrow-up" />
                    <a-icon v-else-if="getImpactClass(evt) === 'bearish'" type="arrow-down" />
                    <a-icon v-else type="minus" />
                    {{ evt.actual || evt.forecast || '--' }}
                  </span>
                </div>
              </template>
              <template v-else>
                <div class="cal-empty">{{ $t('globalMarket.noEvents') }}</div>
              </template>
            </div>
          </div>
        </div>

        <!-- 右侧：工具栏 + AI 分析 -->
        <div class="right-panel">
          <!-- 分析工具栏 -->
          <div class="analysis-toolbar">
            <a-select
              v-model="selectedSymbol"
              :placeholder="$t('dashboard.analysis.empty.selectSymbol')"
              size="large"
              show-search
              allow-clear
              :filter-option="filterSymbolOption"
              @change="handleSymbolChange"
              class="symbol-selector"
            >
              <a-select-option
                v-for="stock in (watchlist || [])"
                :key="`${stock.market}-${stock.symbol}`"
                :value="`${stock.market}:${stock.symbol}`"
              >
                <span class="symbol-option">
                  <a-tag :color="getMarketColor(stock.market)" size="small">{{ getMarketName(stock.market) }}</a-tag>
                  <strong style="margin-left: 6px;">{{ stock.symbol }}</strong>
                  <span v-if="stock.name" class="symbol-name">{{ stock.name }}</span>
                </span>
              </a-select-option>
              <a-select-option key="add-stock-option" value="__add_stock_option__" class="add-stock-option">
                <div style="text-align: center; padding: 4px 0; color: #1890ff;">
                  <a-icon type="plus" style="margin-right: 4px;" />{{ $t('dashboard.analysis.watchlist.add') }}
                </div>
              </a-select-option>
            </a-select>
            <a-button
type="primary"
size="large"
icon="thunderbolt"
@click="startFastAnalysis"
:loading="analyzing"
:disabled="!selectedSymbol || analyzing"
class="analyze-button">
              {{ $t('fastAnalysis.startAnalysis') }}
            </a-button>
            <a-button size="large" icon="history" @click="showHistoryModal = true; loadHistoryList()" class="history-button">
              {{ $t('fastAnalysis.history') }}
            </a-button>
          </div>

          <!-- 分析结果区域 -->
          <div class="analysis-main">
            <div v-if="!analysisResult && !analyzing && !analysisError" class="analysis-placeholder">
              <div class="placeholder-content">
                <div class="placeholder-icon"><a-icon type="robot" /></div>
                <h3>{{ $t('fastAnalysis.selectTip') }}</h3>
                <p>{{ $t('fastAnalysis.selectHint') }}</p>
              </div>
            </div>
            <FastAnalysisReport
              v-if="analysisResult || analyzing || analysisError"
              :result="analysisResult"
              :loading="analyzing"
              :error="analysisError"
              :error-tone="analysisErrorTone"
              @retry="startFastAnalysis"
            />
          </div>
        </div>

        <!-- 右侧自选股面板 -->
        <div class="watchlist-panel">
          <div class="panel-header">
            <span class="panel-title"><a-icon type="star" theme="filled" /> {{ $t('dashboard.analysis.watchlist.title') }}</span>
            <a-button type="link" size="small" @click="showAddStockModal = true">
              <a-icon type="plus" />
            </a-button>
          </div>
          <div class="watchlist-list">
            <div
              v-for="stock in (watchlist || [])"
              :key="`${stock.market}-${stock.symbol}`"
              class="watchlist-item"
              :class="{ active: selectedSymbol === `${stock.market}:${stock.symbol}` }"
              @click="selectWatchlistItem(stock)"
            >
              <div class="item-main">
                <span class="item-symbol">{{ stock.symbol }}</span>
                <span class="item-name">{{ stock.name || getMarketName(stock.market) }}</span>
              </div>
              <div class="item-price" v-if="watchlistPrices[`${stock.market}:${stock.symbol}`]">
                <span class="price-value">{{ formatPrice(watchlistPrices[`${stock.market}:${stock.symbol}`].price) }}</span>
                <span class="price-change" :class="(watchlistPrices[`${stock.market}:${stock.symbol}`]?.change || 0) >= 0 ? 'up' : 'down'">
                  {{ (watchlistPrices[`${stock.market}:${stock.symbol}`]?.change || 0) >= 0 ? '+' : '' }}{{ formatNum(watchlistPrices[`${stock.market}:${stock.symbol}`]?.change) }}%
                </span>
              </div>
              <a-icon type="close" class="item-remove" @click.stop="removeFromWatchlist(stock)" />
            </div>
            <div v-if="!watchlist || watchlist.length === 0" class="watchlist-empty">
              <a-icon type="inbox" />
              <p>{{ $t('dashboard.analysis.empty.noWatchlist') }}</p>
              <a-button type="primary" size="small" @click="showAddStockModal = true">
                <a-icon type="plus" /> {{ $t('dashboard.analysis.watchlist.add') }}
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加股票弹窗 -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddStockModal"
      @ok="handleAddStock"
      @cancel="handleCloseAddStockModal"
      :confirmLoading="addingStock"
      width="600px"
      :okText="$t('dashboard.analysis.modal.addStock.confirm')"
      :cancelText="$t('dashboard.analysis.modal.addStock.cancel')"
    >
      <div class="add-stock-modal-content">
        <!-- Tab标签 -->
        <a-tabs v-model="selectedMarketTab" @change="handleMarketTabChange" class="market-tabs">
          <a-tab-pane
            v-for="marketType in marketTypes"
            :key="marketType.value"
            :tab="$t(marketType.i18nKey || `dashboard.analysis.market.${marketType.value}`)"
          >
          </a-tab-pane>
        </a-tabs>

        <!-- 搜索/输入框 -->
        <div class="symbol-search-section">
          <a-input-search
            v-model="symbolSearchKeyword"
            :placeholder="$t('dashboard.analysis.modal.addStock.searchOrInputPlaceholder')"
            @search="handleSearchOrInput"
            @change="handleSymbolSearchInput"
            :loading="searchingSymbols"
            size="large"
            allow-clear
          >
            <a-button slot="enterButton" type="primary" icon="search">
              {{ $t('dashboard.analysis.modal.addStock.search') }}
            </a-button>
          </a-input-search>
        </div>

        <!-- 搜索结果 -->
        <div v-if="symbolSearchResults.length > 0" class="search-results-section">
          <div class="section-title">
            <a-icon type="search" style="margin-right: 4px;" />
            {{ $t('dashboard.analysis.modal.addStock.searchResults') }}
          </div>
          <a-list
            :data-source="symbolSearchResults"
            :loading="searchingSymbols"
            size="small"
            class="symbol-list"
          >
            <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
              <a-list-item-meta>
                <template slot="title">
                  <div class="symbol-item-content">
                    <span class="symbol-code">{{ item.symbol }}</span>
                    <span class="symbol-name">{{ item.name }}</span>
                    <a-tag v-if="item.exchange" size="small" color="blue" style="margin-left: 8px;">
                      {{ item.exchange }}
                    </a-tag>
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </a-list>
        </div>

        <!-- 热门标的 -->
        <div class="hot-symbols-section">
          <div class="section-title">
            <a-icon type="fire" style="color: #ff4d4f; margin-right: 4px;" />
            {{ $t('dashboard.analysis.modal.addStock.hotSymbols') }}
          </div>
          <a-spin :spinning="loadingHotSymbols">
            <a-list
              v-if="hotSymbols.length > 0"
              :data-source="hotSymbols"
              size="small"
              class="symbol-list"
            >
              <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
                <a-list-item-meta>
                  <template slot="title">
                    <div class="symbol-item-content">
                      <span class="symbol-code">{{ item.symbol }}</span>
                      <span class="symbol-name">{{ item.name }}</span>
                      <a-tag v-if="item.exchange" size="small" color="orange" style="margin-left: 8px;">
                        {{ item.exchange }}
                      </a-tag>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
            <a-empty v-else :description="$t('dashboard.analysis.modal.addStock.noHotSymbols')" :image="false" />
          </a-spin>
        </div>

        <!-- 选中的标的显示 -->
        <div v-if="selectedSymbolForAdd" class="selected-symbol-section">
          <a-alert
            :message="$t('dashboard.analysis.modal.addStock.selectedSymbol')"
            type="info"
            show-icon
            closable
            @close="selectedSymbolForAdd = null"
          >
            <template slot="description">
              <div class="selected-symbol-info">
                <a-tag :color="getMarketColor(selectedSymbolForAdd.market)" style="margin-right: 8px;">
                  {{ $t(`dashboard.analysis.market.${selectedSymbolForAdd.market}`) }}
                </a-tag>
                <strong>{{ selectedSymbolForAdd.symbol }}</strong>
                <span v-if="selectedSymbolForAdd.name" style="color: #999; margin-left: 8px;">{{ selectedSymbolForAdd.name }}</span>
              </div>
            </template>
          </a-alert>
        </div>
      </div>
    </a-modal>

    <!-- 历史分析列表弹窗 -->
    <a-modal
      :title="$t('dashboard.analysis.modal.history.title')"
      :visible="showHistoryModal"
      @cancel="showHistoryModal = false"
      :footer="null"
      width="800px"
      :bodyStyle="{ maxHeight: '60vh', overflowY: 'auto' }"
    >
      <a-spin :spinning="historyLoading">
        <a-list
          :data-source="historyList"
          :pagination="{
            current: historyPage,
            pageSize: historyPageSize,
            total: historyTotal,
            onChange: (page) => { historyPage = page; loadHistoryList() },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onShowSizeChange: (current, size) => { historyPageSize = size; historyPage = 1; loadHistoryList() }
          }"
        >
          <a-list-item slot="renderItem" slot-scope="item">
            <a-list-item-meta>
              <template slot="title">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px;">
                      {{ getMarketName(item.market) }}
                    </a-tag>
                    <strong>{{ item.symbol }}</strong>
                    <a-tag
                      :color="item.decision === 'BUY' ? 'green' : (item.decision === 'SELL' ? 'red' : 'blue')"
                      style="margin-left: 12px;"
                    >
                      {{ item.decision }}
                    </a-tag>
                    <span style="color: #999; margin-left: 8px; font-size: 12px;">
                      {{ $t('fastAnalysis.confidence') }}: {{ item.confidence }}%
                    </span>
                  </div>
                  <div>
                    <a-button
                      type="link"
                      size="small"
                      icon="eye"
                      @click="viewHistoryResult(item)"
                    >
                      {{ $t('dashboard.analysis.modal.history.viewResult') }}
                    </a-button>
                    <a-popconfirm
                      :title="$t('dashboard.analysis.modal.history.deleteConfirm')"
                      :ok-text="$t('common.confirm')"
                      :cancel-text="$t('common.cancel')"
                      @confirm="deleteHistoryItem(item)"
                    >
                      <a-button
                        type="link"
                        size="small"
                        icon="delete"
                        style="color: #ff4d4f;"
                      >
                        {{ $t('dashboard.analysis.modal.history.delete') }}
                      </a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </template>
              <template slot="description">
                <div style="color: #666; font-size: 12px;">
                  <span v-if="item.price">${{ formatNumber(item.price) }}</span>
                  <span v-if="item.summary" style="margin-left: 8px;">{{ item.summary.substring(0, 80) }}{{ item.summary.length > 80 ? '...' : '' }}</span>
                </div>
                <div v-if="item.created_at" style="color: #999; font-size: 12px; margin-top: 4px;">
                  {{ formatIsoTime(item.created_at) }}
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </a-list>
        <a-empty v-if="!historyLoading && historyList.length === 0" :description="$t('dashboard.analysis.empty.noHistory')" />
      </a-spin>
    </a-modal>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, removeWatchlist, getWatchlistPrices, getMarketTypes, searchSymbols, getHotSymbols } from '@/api/market'
import { fastAnalyze, getAllAnalysisHistory, deleteAnalysisHistory } from '@/api/fast-analysis'
import { getMarketSentiment, getMarketOverview, getMarketHeatmap, getEconomicCalendar } from '@/api/global-market'
import FastAnalysisReport from './components/FastAnalysisReport.vue'

export default {
  name: 'Analysis',
  props: {
    embedded: {
      type: Boolean,
      default: false
    },
    presetSymbol: {
      type: String,
      default: ''
    },
    autoAnalyzeSignal: {
      type: Number,
      default: 0
    }
  },
  components: {
    FastAnalysisReport
  },
  data () {
    return {
      loadingMarket: false,
      heatmapType: 'crypto',
      marketData: {
        fearGreed: null,
        vix: null,
        dxy: null,
        indices: [],
        heatmap: { crypto: [], commodities: [], sectors: [], forex: [] },
        calendar: []
      },
      // 独立加载状态 - 渐进式加载
      loadingSentiment: false,
      loadingIndices: false,
      loadingHeatmap: false,
      loadingCalendar: false,
      watchlistPriceTimer: null,
      watchlistPrices: {},
      localUserInfo: {},
      loadingUserInfo: false,
      userId: 1,
      watchlist: [],
      loadingWatchlist: false,
      showAddStockModal: false,
      addingStock: false,
      selectedSymbol: undefined,
      analyzing: false,
      analysisResult: null,
      analysisError: null,
      analysisErrorTone: 'error',
      showHistoryModal: false,
      historyList: [],
      historyLoading: false,
      historyPage: 1,
      historyPageSize: 20,
      historyTotal: 0,
      marketTypes: [],
      selectedMarketTab: '',
      symbolSearchKeyword: '',
      symbolSearchResults: [],
      searchingSymbols: false,
      hotSymbols: [],
      loadingHotSymbols: false,
      selectedSymbolForAdd: null,
      searchTimer: null,
      hasSearched: false
    }
  },
  computed: {
    ...mapGetters(['userInfo']),
    ...mapState({
      navTheme: state => state.app.theme,
      primaryColor: state => state.app.color || '#1890ff'
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    isZhLocale () {
      return this.$i18n.locale === 'zh-CN'
    },
    currentHeatmap () {
      return this.marketData.heatmap[this.heatmapType] || []
    },
    storeUserInfo () {
      return this.userInfo || {}
    },
    mergedUserInfo () {
      return this.localUserInfo && this.localUserInfo.email ? this.localUserInfo : this.storeUserInfo
    }
  },
  created () {
    this.loadUserInfo()
    this.loadMarketTypes()
    this.loadWatchlist()
    this.loadMarketData()
  },
  mounted () {
    this.startWatchlistPriceRefresh()
  },
  beforeDestroy () {
    if (this.watchlistPriceTimer) {
      clearInterval(this.watchlistPriceTimer)
    }
  },
  methods: {
    filterSymbolOption (input, option) {
      const value = option.componentOptions?.propsData?.value || ''
      if (value === '__add_stock_option__') return true
      return value.toLowerCase().includes(input.toLowerCase())
    },
    handleSymbolChange (value) {
      if (value === '__add_stock_option__') {
        this.showAddStockModal = true
        this.$nextTick(() => {
          this.selectedSymbol = undefined
        })
        return
      }
      this.selectedSymbol = value
      // Clear previous result when symbol changes
      this.analysisResult = null
      this.analysisError = null
      this.analysisErrorTone = 'error'
      // Notify parent about symbol change (for Quick Trade integration)
      this.$emit('symbol-change', value)
    },
    selectWatchlistItem (stock) {
      this.selectedSymbol = `${stock.market}:${stock.symbol}`
      this.analysisResult = null
      this.analysisError = null
      this.analysisErrorTone = 'error'
      this.$emit('symbol-change', this.selectedSymbol)
    },
    async loadMarketData () {
      // 渐进式加载：每个数据块独立加载，先出来的先显示
      this.loadingMarket = true

      // 1. 加载情绪指标（恐惧贪婪、VIX、DXY）- 通常最快
      this.loadSentimentData()

      // 2. 加载全球指数 - 可能较慢
      this.loadIndicesData()

      // 3. 加载热力图数据
      this.loadHeatmapData()

      // 4. 加载财经日历
      this.loadCalendarData()
    },
    async loadSentimentData () {
      this.loadingSentiment = true
      try {
        const res = await getMarketSentiment()
        if (res?.code === 1 && res?.data) {
          this.marketData.fearGreed = res.data.fear_greed?.value || null
          this.marketData.vix = res.data.vix?.value || null
          this.marketData.dxy = res.data.dxy?.value || null
        }
      } catch (e) {
        console.error('Load sentiment failed:', e)
      } finally {
        this.loadingSentiment = false
        this.checkAllLoaded()
      }
    },
    async loadIndicesData () {
      this.loadingIndices = true
      try {
        const res = await getMarketOverview()
        if (res?.code === 1 && res?.data) {
          this.marketData.indices = res.data.indices || []
        }
      } catch (e) {
        console.error('Load indices failed:', e)
      } finally {
        this.loadingIndices = false
        this.checkAllLoaded()
      }
    },
    async loadHeatmapData () {
      this.loadingHeatmap = true
      try {
        const res = await getMarketHeatmap()
        if (res?.code === 1 && res?.data) {
          this.marketData.heatmap = {
            crypto: res.data.crypto || [],
            commodities: res.data.commodities || [],
            sectors: res.data.sectors || [],
            forex: res.data.forex || []
          }
        }
      } catch (e) {
        console.error('Load heatmap failed:', e)
      } finally {
        this.loadingHeatmap = false
        this.checkAllLoaded()
      }
    },
    async loadCalendarData () {
      this.loadingCalendar = true
      try {
        const res = await getEconomicCalendar()
        if (res?.code === 1) {
          this.marketData.calendar = res.data || []
        }
      } catch (e) {
        console.error('Load calendar failed:', e)
      } finally {
        this.loadingCalendar = false
        this.checkAllLoaded()
      }
    },
    checkAllLoaded () {
      // 当所有数据都加载完成时，关闭总loading状态
      if (!this.loadingSentiment && !this.loadingIndices && !this.loadingHeatmap && !this.loadingCalendar) {
        this.loadingMarket = false
      }
    },
    getFearGreedClass (val) {
      if (!val) return ''
      if (val <= 25) return 'extreme-fear'
      if (val <= 45) return 'fear'
      if (val <= 55) return 'neutral'
      if (val <= 75) return 'greed'
      return 'extreme-greed'
    },
    getVixLevel (val) {
      if (!val) return ''
      if (val < 15) return 'low'
      if (val < 25) return 'medium'
      return 'high'
    },
    formatNum (num, digits = 2) {
      if (num === undefined || num === null || isNaN(num)) return '--'
      return Number(num).toFixed(digits)
    },
    getHeatmapStyle (value) {
      const v = parseFloat(value) || 0
      const intensity = Math.min(Math.abs(v) / 5, 1)
      if (v >= 0) {
        return { background: `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`, color: v > 2 ? '#fff' : '#166534' }
      } else {
        return { background: `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`, color: v < -2 ? '#fff' : '#991b1b' }
      }
    },
    getCountryFlag (country) {
      const flags = { US: '🇺🇸', CN: '🇨🇳', EU: '🇪🇺', JP: '🇯🇵', UK: '🇬🇧', DE: '🇩🇪', AU: '🇦🇺', CA: '🇨🇦' }
      return flags[country] || '🌍'
    },
    formatCalendarDate (dateStr) {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // 判断是否是今天或明天
        if (date.toDateString() === today.toDateString()) {
          return this.isZhLocale ? '今天' : 'Today'
        }
        if (date.toDateString() === tomorrow.toDateString()) {
          return this.isZhLocale ? '明天' : 'Tmrw'
        }

        // 显示月/日
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}/${day}`
      } catch (e) {
        return dateStr
      }
    },
    formatPrice (price) {
      if (!price) return '--'
      if (price >= 10000) return (price / 1000).toFixed(1) + 'K'
      if (price >= 1000) return price.toFixed(0)
      return price.toFixed(2)
    },
    formatHeatmapPrice (price) {
      if (!price) return ''
      if (price >= 10000) return '$' + (price / 1000).toFixed(1) + 'K'
      if (price >= 1000) return '$' + price.toFixed(0)
      if (price >= 1) return '$' + price.toFixed(2)
      return '$' + price.toFixed(4)
    },
    getHeatmapName (item) {
      // sectors, commodities, forex 都需要多语言适配
      if (this.heatmapType === 'sectors' || this.heatmapType === 'commodities' || this.heatmapType === 'forex') {
        return this.isZhLocale ? (item.name_cn || item.name) : (item.name_en || item.name)
      }
      return item.name
    },
    getImpactClass (evt) {
      return evt.actual_impact || evt.expected_impact || 'neutral'
    },
    getMarketColor (market) {
      const colors = {
        'USStock': 'green',
        'Crypto': 'purple',
        'Forex': 'gold',
        'Futures': 'cyan'
      }
      return colors[market] || 'default'
    },
    getCurrencySymbol (market) {
      return '$'
    },
    formatCreditNum (n) {
      if (n === undefined || n === null || n === '') return '--'
      const x = Number(n)
      if (Number.isNaN(x)) return String(n)
      return Number.isInteger(x) ? String(x) : x.toFixed(2)
    },
    async refreshUserInfoFromServer () {
      try {
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.localUserInfo = res.data
          this.userId = res.data.id
          this.$store.commit('SET_INFO', res.data)
        }
      } catch (e) {
        // 静默失败，积分以接口返回为准
      }
    },
    async startFastAnalysis () {
      if (this.analyzing) return
      if (!this.selectedSymbol) {
        this.$message.warning(this.$t('dashboard.analysis.message.selectSymbol'))
        return
      }

      this.analyzing = true
      this.analysisError = null
      this.analysisErrorTone = 'error'

      const [market, symbol] = this.selectedSymbol.split(':')
      const language = this.$store.getters.lang || 'zh-CN'

      try {
        const res = await fastAnalyze({
          market: market,
          symbol: symbol,
          language: language,
          timeframe: '1D'
        })

        if (res && res.code === 1 && res.data) {
          const payload = { ...res.data }
          delete payload.credits_charged
          delete payload.remaining_credits
          this.analysisResult = payload
          const rem = res.data.remaining_credits
          if (rem !== undefined && rem !== null) {
            this.$message.success(
              this.$t('fastAnalysis.analysisCompleteWithCredits', { remaining: this.formatCreditNum(rem) })
            )
          } else {
            this.$message.success(this.$t('dashboard.analysis.message.analysisComplete'))
          }
          await this.refreshUserInfoFromServer()
        } else {
          throw new Error(res?.msg || '分析失败')
        }
      } catch (error) {
        console.error('Fast analysis failed:', error)
        const status = error?.response?.status
        const body = error?.response?.data || {}
        const msg = body.msg
        const data = body.data

        if (status === 429 && data && data.in_progress) {
          this.analysisErrorTone = 'warning'
          this.analysisError = this.$t('fastAnalysis.analysisInProgress')
          this.$message.warning(this.analysisError)
        } else if (status === 400 && msg === 'Insufficient credits') {
          this.analysisError = this.$t('fastAnalysis.insufficientCreditsDetail', {
            required: this.formatCreditNum(data?.required),
            current: this.formatCreditNum(data?.current),
            shortage: this.formatCreditNum(data?.shortage)
          })
          this.$message.error(this.analysisError)
        } else {
          this.analysisError = msg || error?.message || this.$t('dashboard.analysis.message.analysisFailed')
          this.$message.error(this.analysisError)
        }
      } finally {
        this.analyzing = false
      }
    },
    async loadHistoryList () {
      this.historyLoading = true
      try {
        const res = await getAllAnalysisHistory({
          page: this.historyPage,
          pagesize: this.historyPageSize
        })

        if (res && res.code === 1 && res.data) {
          this.historyList = res.data.list || []
          this.historyTotal = res.data.total || 0
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.loadHistoryFailed') || '加载历史记录失败')
      } finally {
        this.historyLoading = false
      }
    },
    async viewHistoryResult (item) {
      // 如果有完整结果，直接显示
      if (item.full_result) {
        this.analysisResult = item.full_result
        this.selectedSymbol = `${item.market}:${item.symbol}`
        this.showHistoryModal = false
        return
      }

      // 否则使用历史记录中的基本信息构建显示
      this.analysisResult = {
        decision: item.decision,
        confidence: item.confidence,
        summary: item.summary,
        market_data: {
          current_price: item.price,
          change_24h: 0
        },
        trading_plan: {
          entry_price: item.price,
          stop_loss: item.price * 0.95,
          take_profit: item.price * 1.05
        },
        scores: item.scores || {},
        reasons: item.reasons || [],
        risks: [],
        indicators: item.indicators || {},
        memory_id: item.id,
        analysis_time_ms: 0
      }
      this.selectedSymbol = `${item.market}:${item.symbol}`
      this.showHistoryModal = false
    },
    async deleteHistoryItem (item) {
      try {
        const res = await deleteAnalysisHistory(item.id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.deleteSuccess'))
          this.loadHistoryList()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.deleteFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.deleteFailed'))
      }
    },
    formatTime (timestamp) {
      if (!timestamp) return '-'
      const date = new Date(timestamp * 1000)
      return date.toLocaleString('zh-CN')
    },
    formatIsoTime (isoString) {
      if (!isoString) return '-'
      const date = new Date(isoString)
      return date.toLocaleString('zh-CN')
    },
    getStatusColor (status) {
      const colors = {
        'pending': 'orange',
        'processing': 'blue',
        'completed': 'green',
        'failed': 'red'
      }
      return colors[status] || 'default'
    },
    getStatusText (status) {
      const statusMap = {
        'pending': 'dashboard.analysis.status.pending',
        'processing': 'dashboard.analysis.status.processing',
        'completed': 'dashboard.analysis.status.completed',
        'failed': 'dashboard.analysis.status.failed'
      }
      const key = statusMap[status]
      return key ? this.$t(key) : status
    },
    async loadUserInfo () {
      this.loadingUserInfo = true
      try {
        if (this.storeUserInfo && this.storeUserInfo.email) {
          this.localUserInfo = this.storeUserInfo
          this.userId = this.storeUserInfo.id
          this.loadingUserInfo = false
          this.loadWatchlist()
          return
        }
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.localUserInfo = res.data
          this.userId = res.data.id
          this.$store.commit('SET_INFO', res.data)
          this.loadWatchlist()
        }
      } catch (error) {
        // Silent fail
      } finally {
        this.loadingUserInfo = false
      }
    },
    async loadWatchlist () {
      if (!this.userId) return
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) {
          this.watchlist = res.data.map(item => ({
            ...item,
            price: 0,
            change: 0,
            changePercent: 0
          }))
          await this.loadWatchlistPrices()
        }
      } catch (error) {
        // Silent fail
      } finally {
        this.loadingWatchlist = false
      }
    },
    async loadWatchlistPrices () {
      if (!this.watchlist || this.watchlist.length === 0) return

      try {
        const watchlistData = this.watchlist.map(item => ({
          market: item.market,
          symbol: item.symbol
        }))

        const res = await getWatchlistPrices({
          watchlist: watchlistData
        })

        if (res && res.code === 1 && res.data) {
          const priceMap = {}
          const pricesObj = {}
          res.data.forEach(item => {
            priceMap[`${item.market}-${item.symbol}`] = item
            // 同时填充 watchlistPrices 对象（使用 : 作为键）
            pricesObj[`${item.market}:${item.symbol}`] = {
              price: item.price || 0,
              change: item.changePercent || 0
            }
          })
          this.watchlistPrices = pricesObj

          this.watchlist = this.watchlist.map(item => {
            const key = `${item.market}-${item.symbol}`
            const priceData = priceMap[key]
            if (priceData) {
              return {
                ...item,
                price: priceData.price || 0,
                change: priceData.change || 0,
                changePercent: priceData.changePercent || 0
              }
            }
            return item
          })
        }
      } catch (error) {
        // Silent fail
      }
    },
    startWatchlistPriceRefresh () {
      this.watchlistPriceTimer = setInterval(() => {
        if (this.watchlist && this.watchlist.length > 0) {
          this.loadWatchlistPrices()
        }
      }, 30000)

      if (this.watchlist && this.watchlist.length > 0) {
        this.loadWatchlistPrices()
      }
    },
    async handleAddStock () {
      let market = ''
      let symbol = ''
      let name = ''

      if (this.selectedSymbolForAdd) {
        market = this.selectedSymbolForAdd.market
        symbol = this.selectedSymbolForAdd.symbol.toUpperCase()
        name = this.selectedSymbolForAdd.name || ''
      } else if (this.symbolSearchKeyword && this.symbolSearchKeyword.trim()) {
        if (!this.selectedMarketTab) {
          this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
          return
        }
        market = this.selectedMarketTab
        symbol = this.symbolSearchKeyword.trim().toUpperCase()
        name = ''
      } else {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectOrEnterSymbol'))
        return
      }

      this.addingStock = true
      try {
        const res = await addWatchlist({
          userid: this.userId,
          market: market,
          symbol: symbol,
          name: name
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.addStockSuccess'))
          this.handleCloseAddStockModal()
          await this.loadWatchlist()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.addStockFailed'))
        }
      } catch (error) {
        const errorMsg = error?.response?.data?.msg || error?.message || this.$t('dashboard.analysis.message.addStockFailed')
        this.$message.error(errorMsg)
      } finally {
        this.addingStock = false
      }
    },
    handleCloseAddStockModal () {
      this.showAddStockModal = false
      this.selectedSymbolForAdd = null
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
      this.hasSearched = false
      this.selectedMarketTab = this.marketTypes.length > 0 ? this.marketTypes[0].value : ''
    },
    handleMarketTabChange (activeKey) {
      this.selectedMarketTab = activeKey
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
      this.selectedSymbolForAdd = null
      this.hasSearched = false
      this.loadHotSymbols(activeKey)
    },
    handleSymbolSearchInput (e) {
      const keyword = e.target.value
      this.symbolSearchKeyword = keyword

      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }

      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearched = false
        this.selectedSymbolForAdd = null
        return
      }

      this.searchTimer = setTimeout(() => {
        this.searchSymbolsInModal(keyword)
      }, 500)
    },
    handleSearchOrInput (keyword) {
      if (!keyword || !keyword.trim()) return

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      if (this.symbolSearchResults.length > 0) return

      if (this.hasSearched && this.symbolSearchResults.length === 0) {
        this.handleDirectAdd()
      } else {
        this.searchSymbolsInModal(keyword)
      }
    },
    async searchSymbolsInModal (keyword) {
      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearched = false
        return
      }

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      this.searchingSymbols = true
      this.hasSearched = true
      try {
        const res = await searchSymbols({
          market: this.selectedMarketTab,
          keyword: keyword.trim(),
          limit: 20
        })
        if (res && res.code === 1 && res.data && res.data.length > 0) {
          this.symbolSearchResults = res.data
        } else {
          this.symbolSearchResults = []
          this.selectedSymbolForAdd = {
            market: this.selectedMarketTab,
            symbol: keyword.trim().toUpperCase(),
            name: ''
          }
        }
      } catch (error) {
        this.symbolSearchResults = []
        this.selectedSymbolForAdd = {
          market: this.selectedMarketTab,
          symbol: keyword.trim().toUpperCase(),
          name: ''
        }
      } finally {
        this.searchingSymbols = false
      }
    },
    handleDirectAdd () {
      if (!this.symbolSearchKeyword || !this.symbolSearchKeyword.trim()) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseEnterSymbol'))
        return
      }

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      this.selectedSymbolForAdd = {
        market: this.selectedMarketTab,
        symbol: this.symbolSearchKeyword.trim().toUpperCase(),
        name: ''
      }
    },
    selectSymbol (symbol) {
      this.selectedSymbolForAdd = {
        market: symbol.market,
        symbol: symbol.symbol,
        name: symbol.name || symbol.symbol
      }
    },
    async loadHotSymbols (market) {
      if (!market) {
        market = this.selectedMarketTab || (this.marketTypes.length > 0 ? this.marketTypes[0].value : '')
      }

      if (!market) return

      this.loadingHotSymbols = true
      try {
        const res = await getHotSymbols({
          market: market,
          limit: 10
        })
        if (res && res.code === 1 && res.data) {
          this.hotSymbols = res.data
        } else {
          this.hotSymbols = []
        }
      } catch (error) {
        this.hotSymbols = []
      } finally {
        this.loadingHotSymbols = false
      }
    },
    async removeFromWatchlist (stock) {
      if (!this.userId) return
      // 支持传入 stock 对象或单独的 symbol/market
      const symbol = typeof stock === 'object' ? stock.symbol : stock
      const market = typeof stock === 'object' ? stock.market : arguments[1]
      try {
        const res = await removeWatchlist({
          userid: this.userId,
          symbol: symbol,
          market: market
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.removeStockSuccess'))
          await this.loadWatchlist()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.removeStockFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.removeStockFailed'))
      }
    },
    getMarketName (market) {
      return this.$t(`dashboard.analysis.market.${market}`) || market
    },
    formatNumber (num) {
      if (typeof num === 'string') return num
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    async loadMarketTypes () {
      try {
        const res = await getMarketTypes()
        if (res && res.code === 1 && res.data && Array.isArray(res.data)) {
          this.marketTypes = res.data.map(item => ({
            value: item.value,
            i18nKey: item.i18nKey || `dashboard.analysis.market.${item.value}`
          }))
        } else {
          this.marketTypes = [
            { value: 'USStock', i18nKey: 'dashboard.analysis.market.USStock' },
            { value: 'Crypto', i18nKey: 'dashboard.analysis.market.Crypto' },
            { value: 'Forex', i18nKey: 'dashboard.analysis.market.Forex' },
            { value: 'Futures', i18nKey: 'dashboard.analysis.market.Futures' }
          ]
        }
      } catch (error) {
        this.marketTypes = [
          { value: 'USStock', i18nKey: 'dashboard.analysis.market.USStock' },
          { value: 'Crypto', i18nKey: 'dashboard.analysis.market.Crypto' },
          { value: 'Forex', i18nKey: 'dashboard.analysis.market.Forex' },
          { value: 'Futures', i18nKey: 'dashboard.analysis.market.Futures' }
        ]
      }

      if (this.marketTypes.length > 0 && !this.selectedMarketTab) {
        this.selectedMarketTab = this.marketTypes[0].value
      }
    }
  },
  watch: {
    presetSymbol (newVal) {
      if (newVal && newVal !== this.selectedSymbol) {
        this.selectedSymbol = newVal
        this.analysisResult = null
        this.analysisError = null
        this.analysisErrorTone = 'error'
      }
    },
    autoAnalyzeSignal (newVal) {
      if (!newVal) return
      if (this.presetSymbol && this.presetSymbol !== this.selectedSymbol) {
        this.selectedSymbol = this.presetSymbol
      }
      this.$nextTick(() => {
        this.startFastAnalysis()
      })
    },
    showAddStockModal (newVal) {
      if (newVal) {
        if (this.marketTypes.length > 0 && !this.selectedMarketTab) {
          this.selectedMarketTab = this.marketTypes[0].value
        }
        if (this.selectedMarketTab) {
          this.loadHotSymbols(this.selectedMarketTab)
        }
      } else {
        this.selectedSymbolForAdd = null
        this.symbolSearchKeyword = ''
        this.symbolSearchResults = []
        this.hasSearched = false
        if (this.searchTimer) {
          clearTimeout(this.searchTimer)
          this.searchTimer = null
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
.ai-analysis-container {
  display: flex;
  height: calc(100vh - 120px);
  background: #f0f2f5;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.ai-analysis-container.embedded {
  height: auto;
  min-height: 700px;
  background: transparent;
}

.ai-analysis-container.embedded .main-content-full {
  box-shadow: none;
  border-radius: 0;
}

// 全宽主内容
.main-content-full {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 12px;
  height: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

// 顶部指数条
.top-index-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;

  .indicator-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 10px;
    background: #fff;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    min-width: 50px;

    .ind-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
    .ind-value { font-size: 13px; font-weight: 700; color: #1e293b; }

    &.fear-greed.extreme-fear .ind-value { color: #dc2626; }
    &.fear-greed.fear .ind-value { color: #ea580c; }
    &.fear-greed.neutral .ind-value { color: #ca8a04; }
    &.fear-greed.greed .ind-value { color: #65a30d; }
    &.fear-greed.extreme-greed .ind-value { color: #16a34a; }
    &.vix.low .ind-value { color: #16a34a; }
    &.vix.medium .ind-value { color: #ca8a04; }
    &.vix.high .ind-value { color: #dc2626; }
    &.dxy .ind-value { color: #2563eb; }
  }

  .indices-marquee {
    flex: 1;
    overflow: hidden;
    min-width: 0;

    .marquee-track {
      display: flex;
      gap: 8px;
      animation: marquee 35s linear infinite;
      width: max-content;
      &:hover { animation-play-state: paused; }
    }

    .index-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      white-space: nowrap;

      .idx-flag { font-size: 11px; }
      .idx-symbol { color: #64748b; font-weight: 500; }
      .idx-price { color: #1e293b; font-weight: 600; }
      .idx-change {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 1px;
        &.up { color: #16a34a; }
        &.down { color: #dc2626; }
      }
    }
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .refresh-btn {
    color: #94a3b8;
    flex-shrink: 0;
    &:hover { color: #1e293b; }
  }
}

// 主体三栏布局
.main-body {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  min-height: 0;
}

// 左侧面板：热力图 + 财经日历
.left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;

  .heatmap-box {
    background: #fff;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #e2e8f0;

    .box-header {
      margin-bottom: 10px;
      ::v-deep .ant-radio-group .ant-radio-button-wrapper {
        font-size: 10px;
        padding: 0 6px;
        height: 22px;
        line-height: 20px;
        &.ant-radio-button-wrapper-checked {
          background: var(--primary-color, #1890ff);
          border-color: var(--primary-color, #1890ff);
          color: #fff;
        }
      }
    }

    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;

      .heat-cell {
        padding: 6px 4px;
        border-radius: 4px;
        text-align: center;
        font-size: 9px;
        .heat-name { display: block; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px; }
        .heat-price { display: block; font-size: 9px; opacity: 0.8; margin-bottom: 1px; }
        .heat-val { font-weight: 700; font-size: 10px; }
      }
    }
  }

  .calendar-box {
    flex: 1;
    background: #fff;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    .box-header {
      margin-bottom: 8px;
      .box-title {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
        .anticon { margin-right: 6px; color: var(--primary-color, #1890ff); }
      }
    }

    .calendar-list {
      flex: 1;
      overflow-y: auto;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

      .cal-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 0;
        border-bottom: 1px solid #f1f5f9;
        font-size: 10px;
        &:last-child { border-bottom: none; }
        &.high { border-left: 3px solid #dc2626; padding-left: 8px; margin-left: -4px; }
        &.medium { border-left: 3px solid #ca8a04; padding-left: 8px; margin-left: -4px; }
        &.low { border-left: 3px solid #16a34a; padding-left: 8px; margin-left: -4px; }

        .cal-date {
          font-size: 9px;
          color: #94a3b8;
          min-width: 32px;
          font-weight: 500;
        }
        .cal-time { color: #64748b; min-width: 36px; font-weight: 500; }
        .cal-flag { font-size: 12px; }
        .cal-name { flex: 1; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-impact {
          font-weight: 600;
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 2px;
          &.bullish { color: #16a34a; }
          &.bearish { color: #dc2626; }
          &.neutral { color: #94a3b8; }
        }
      }
      .cal-empty { text-align: center; color: #94a3b8; padding: 20px 0; font-size: 12px; }
    }
  }
}

// 右侧面板：工具栏 + 分析结果
// 中间分析面板
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;

  .analysis-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafafa;
    border-radius: 8px 8px 0 0;

    .symbol-selector {
      flex: 1;
      max-width: 320px;
    }

    .analyze-button {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
    }

    .history-button {
      border-color: #d9d9d9;
    }
  }

  .analysis-main {
    flex: 1;
    overflow: auto;
    padding: 16px;
    min-height: 0;

    .analysis-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 300px;

      .placeholder-content {
        text-align: center;
        .placeholder-icon { font-size: 72px; color: var(--primary-color, #1890ff); opacity: 0.5; margin-bottom: 20px; }
        h3 { font-size: 18px; color: #1e293b; margin-bottom: 8px; }
        p { font-size: 14px; color: #64748b; }
      }
    }
  }
}

// 右侧自选股面板
.watchlist-panel {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafafa;

    .panel-title {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      .anticon { color: #facc15; margin-right: 6px; }
    }
  }

  .watchlist-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

    .watchlist-item {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 4px;

      &:hover { background: #f8fafc; }
      &.active { background: #e6f7ff; border: 1px solid #91d5ff; }

      .item-main {
        flex: 1;
        min-width: 0;
        .item-symbol { display: block; font-size: 12px; font-weight: 600; color: #1e293b; }
        .item-name { display: block; font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      }

      .item-price {
        text-align: right;
        margin-right: 8px;
        font-family: 'SF Mono', Monaco, monospace;
        .price-value { display: block; font-size: 11px; font-weight: 600; color: #1e293b; }
        .price-change {
          display: block;
          font-size: 10px;
          font-weight: 600;
          &.up { color: #16a34a; }
          &.down { color: #dc2626; }
        }
      }

      .item-remove {
        color: #cbd5e1;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s;
        &:hover { color: #dc2626; }
      }

      &:hover .item-remove { opacity: 1; }
    }

    .watchlist-empty {
      text-align: center;
      padding: 24px 12px;
      color: #94a3b8;
      .anticon { font-size: 32px; margin-bottom: 8px; display: block; }
      p { font-size: 12px; margin-bottom: 12px; }
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive */
@media (max-width: 992px) {
  .ai-analysis-container {
    height: auto;
    min-height: calc(100vh - 64px);
    overflow-y: auto;
  }

  .main-content-full {
    height: auto;
    min-height: auto;
  }

  .top-index-bar {
    flex-wrap: wrap;
    padding: 8px;

    .indicator-box {
      min-width: 45px;
      padding: 3px 6px;
    }

    .indices-marquee {
      order: 10;
      width: 100%;
      margin-top: 8px;
    }
  }

  .main-body {
    flex-direction: column;
    padding: 12px;
  }

  .left-panel {
    width: 100%;
    flex-direction: row;
    gap: 12px;

    .heatmap-box, .calendar-box {
      flex: 1;
      min-width: 0;
    }

    .calendar-box {
      max-height: 200px;
    }
  }

  .right-panel {
    .analysis-toolbar {
      flex-wrap: wrap;
      .symbol-selector { width: 100% !important; max-width: none !important; }
      .analyze-button, .history-button { flex: 1; }
    }
  }

  .watchlist-panel {
    width: 100%;
    max-height: 200px;
    order: -1;
  }
}

/* Dark Theme */
.ai-analysis-container.theme-dark {
  background: #131722;
  color: #d1d4dc;

  .main-content-full {
    background: #1e222d;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .top-index-bar {
    background: #1e222d;
    border-bottom-color: #363c4e;

    .indicator-box {
      background: #2a2e39;
      border-color: #363c4e;
      .ind-label { color: #868993; }
      .ind-value { color: #d1d4dc; }
    }

    .indices-marquee .index-item {
      background: #2a2e39;
      border-color: #363c4e;
      .idx-symbol { color: #868993; }
      .idx-price { color: #d1d4dc; }
    }

    .refresh-btn {
      color: #868993;
      &:hover { color: #d1d4dc; }
    }
  }

  .watchlist-panel {
    background: #2a2e39;
    border-color: #363c4e;

    .panel-header {
      background: #1e222d;
      border-bottom-color: #363c4e;
      .panel-title { color: #868993; }
    }

    .watchlist-list {
      .watchlist-item {
        &:hover { background: #363c4e; }
        &.active { background: rgba(24, 144, 255, 0.1); border-color: #1890ff; }
        .item-main {
          .item-symbol { color: #d1d4dc; }
          .item-name { color: #64748b; }
        }
        .item-price .price-value { color: #d1d4dc; }
      }
      .watchlist-empty { color: #64748b; }
    }
  }

  .watchlist-bar-legacy {
    background: #1e222d;
    border-bottom-color: #363c4e;

    .stock-chip {
      background: #2a2e39;
      border-color: #363c4e;
      &:hover, &.active { border-color: var(--primary-color, #1890ff); background: rgba(24, 144, 255, 0.1); }
      .chip-symbol { color: #d1d4dc; }
      .chip-price { color: #868993; }
    }
  }

  .left-panel {
    .heatmap-box {
      background: #2a2e39;
      border-color: #363c4e;

      ::v-deep .ant-radio-group .ant-radio-button-wrapper {
        background: #1e222d;
        border-color: #363c4e;
        color: #868993;
        &:hover { color: #d1d4dc; }
      }
    }

    .calendar-box {
      background: #2a2e39;
      border-color: #363c4e;

      .box-title { color: #868993; }
      .cal-item {
        border-bottom-color: #363c4e;
        .cal-date { color: #64748b; }
        .cal-time { color: #868993; }
        .cal-name { color: #d1d4dc; }
      }
      .cal-empty { color: #64748b; }
    }
  }

  .right-panel {
    background: #2a2e39;
    border-color: #363c4e;

    .analysis-toolbar {
      background: #1e222d;
      border-bottom-color: #363c4e;

      .history-button {
        background: #2a2e39;
        border-color: #363c4e;
        color: #d1d4dc;
      }
    }

    .analysis-main {
      .analysis-placeholder .placeholder-content {
        h3 { color: #d1d4dc; }
        p { color: #868993; }
      }
    }
  }

  // 旧样式兼容
  .watchlist-bar-compat {
    background: #1e222d;
    border-top-color: #363c4e;

    .bar-label { color: #868993; }

    .stock-chip {
      background: #2a2e39;
      border-color: #363c4e;

      &:hover, &.active {
        border-color: var(--primary-color, #1890ff);
        background: rgba(24, 144, 255, 0.1);
      }

      .chip-symbol { color: #d1d4dc; }
      .chip-price { color: #868993; }
      .chip-remove { color: #64748b; }
    }
  }

  ::v-deep .symbol-selector {
    .ant-select-selection {
      background-color: #2a2e39;
      border-color: #363c4e;
      color: #d1d4dc;
    }
  }
}

/* Add Stock Modal */
.add-stock-modal-content {
  .market-tabs { margin-bottom: 16px; }
  .symbol-search-section { margin-bottom: 24px; }

  .search-results-section,
  .hot-symbols-section {
    margin-bottom: 24px;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
  }

  .symbol-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    .symbol-list-item {
      cursor: pointer;
      padding: 8px 12px;
      transition: background-color 0.3s;

      &:hover { background-color: #f5f5f5; }

      .symbol-item-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .symbol-code {
          font-weight: 600;
          color: #262626;
          min-width: 80px;
        }

        .symbol-name {
          color: #595959;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .selected-symbol-section {
    margin-top: 16px;

    .selected-symbol-info {
      display: flex;
      align-items: center;
    }
  }
}

/* 骨架屏加载动画 - 渐进式加载 */
.skeleton-box {
  .skeleton-text {
    display: block;
    height: 12px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin: 3px 0;

    &.short { width: 40px; height: 9px; }
  }
}

.skeleton-cell {
  background: #f8fafc !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;

  .skeleton-text {
    width: 80%;
    height: 10px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 3px;
    margin: 2px 0;

    &.short { width: 50%; height: 8px; }
  }
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;

  .skeleton-text {
    height: 12px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
    flex: 1;

    &.short { flex: none; width: 40px; }
  }
}

.indices-loading, .indices-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 16px;
}

.indices-loading {
  .anticon { margin-right: 6px; }
}

.heatmap-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 12px;
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 暗色主题下的骨架屏 */
.theme-dark {
  .skeleton-box, .skeleton-cell, .skeleton-item {
    .skeleton-text {
      background: linear-gradient(90deg, #363c4e 25%, #424857 50%, #363c4e 75%);
      background-size: 200% 100%;
    }
  }

  .skeleton-cell {
    background: #2a2e39 !important;
  }

  .indices-loading, .indices-empty, .heatmap-empty {
    color: #64748b;
  }
}
</style>
