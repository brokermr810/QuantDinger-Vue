<template>
  <div class="indicator-ide" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Header toolbar -->
    <div class="ide-toolbar">
      <div class="toolbar-left">
        <div class="ide-toolbar-code-slot">
          <a-tooltip :title="codeDrawerVisible ? $t('indicatorIde.hideCode') : $t('indicatorIde.showCode')">
            <a-button
              class="ide-toolbar-icon-btn"
              size="small"
              :type="codeDrawerVisible ? 'primary' : 'default'"
              @click="codeDrawerVisible = !codeDrawerVisible"
            >
              <a-icon type="code" />
            </a-button>
          </a-tooltip>
        </div>

        <div class="ide-toolbar-group ide-toolbar-group--watchlist">
          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.watchlist') }}</span>
          <a-select
            v-model="selectedWatchlistKey"
            class="ide-toolbar-select ide-toolbar-select--watchlist"
            :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
            size="small"
            show-search
            allow-clear
            :filter-option="filterWatchlistOption"
            :dropdown-class-name="isDarkTheme ? 'ide-watchlist-dropdown ide-watchlist-dropdown--dark' : 'ide-watchlist-dropdown'"
            @change="handleWatchlistChange"
          >
            <a-select-option
              v-for="w in watchlist"
              :key="`${w.market}:${w.symbol}`"
              :value="`${w.market}:${w.symbol}`"
            >
              <span class="wl-opt-tag" :class="'wl-mkt-' + (w.market || '').toLowerCase()">{{ marketLabel(w.market) }}</span>
              <strong class="wl-opt-symbol">{{ w.symbol }}</strong>
              <span v-if="w.name" class="wl-opt-name">{{ w.name }}</span>
            </a-select-option>
            <a-select-option key="__add__" value="__add__" class="add-option">
              <div class="ide-watchlist-add-row">
                <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
              </div>
            </a-select-option>
          </a-select>
        </div>

        <div class="ide-toolbar-group ide-toolbar-group--tf">
          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.timeframe') }}</span>
          <a-radio-group
            v-model="timeframe"
            button-style="solid"
            size="small"
            class="tf-group ide-tf-seg"
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

        <div class="ide-toolbar-group ide-toolbar-group--indicator">
          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.indicator') }}</span>
          <a-select
            v-model="selectedIndicatorId"
            class="ide-toolbar-select ide-toolbar-select--indicator"
            :placeholder="$t('backtest-center.indicator.selectIndicatorPlaceholder')"
            size="small"
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
            >
              <span>{{ ind.name || ('Indicator #' + ind.id) }}</span>
              <a-tag
                v-if="Number(ind.is_buy) === 1"
                color="purple"
                style="margin-left: 6px; font-size: 10px; line-height: 16px; padding: 0 4px;"
              >{{ $t('indicatorIde.purchasedBadge') }}</a-tag>
            </a-select-option>
          </a-select>
        </div>

      </div>

      <div class="toolbar-right">
        <a-tooltip placement="bottomLeft">
          <template slot="title">
            {{ quickTradeDrawerVisible ? $t('indicatorIde.hideQuickTrade') : $t('indicatorIde.showQuickTrade') }}
          </template>
          <a-button
            class="ide-toolbar-qt-btn"
            size="small"
            :type="quickTradeDrawerVisible ? 'primary' : 'default'"
            @click="toggleQuickTradeDrawer"
          >
            <a-icon type="thunderbolt" theme="filled" />
            <span class="ide-toolbar-qt-label">{{ $t('quickTrade.title') }}</span>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- Main split panels -->
    <div class="ide-main">
      <!-- Left panel (collapsible drawer) -->
      <div v-show="codeDrawerVisible" class="ide-left">
        <!-- Code Editor (collapsible) -->
        <div class="code-panel" :class="{ collapsed: !codePanelExpanded }">
          <div class="panel-title" @click="codePanelExpanded = !codePanelExpanded" style="cursor: pointer;">
            <a-icon type="code" />
            <span>{{ $t('indicatorIde.codeEditor') }}</span>
            <a-tag v-if="codeDirty && !selectedIndicatorIsPurchased" color="orange" size="small" style="margin-left: 8px;">{{ $t('indicatorIde.modified') }}</a-tag>
            <a-tag v-if="selectedIndicatorIsPurchased" color="purple" size="small" style="margin-left: 8px;">{{ $t('indicatorIde.purchasedReadOnlyTag') }}</a-tag>
            <div class="panel-title-actions" @click.stop>
              <a-tooltip :title="$t('dashboard.indicator.create')">
                <a-button size="small" :loading="creatingIndicator" @click="handleCreateIndicator"><a-icon type="plus" /></a-button>
              </a-tooltip>
              <a-tooltip :title="selectedIndicatorIsPurchased ? $t('indicatorIde.saveBlockedPurchased') : $t('indicatorIde.save')">
                <a-button size="small" :disabled="!selectedIndicatorId || !codeDirty || selectedIndicatorIsPurchased" @click="saveIndicator"><a-icon type="save" /></a-button>
              </a-tooltip>
              <a-tooltip :title="selectedIndicatorIsPurchased ? $t('indicatorIde.deleteBlockedPurchased') : $t('dashboard.indicator.action.delete')">
                <a-button
                  size="small"
                  :disabled="!selectedIndicatorId || selectedIndicatorIsPurchased"
                  :loading="deletingIndicator"
                  @click="handleDeleteIndicator"
                ><a-icon type="delete" /></a-button>
              </a-tooltip>
              <a-tooltip :title="selectedIndicatorIsPurchased ? $t('indicatorIde.publishBlockedPurchased') : $t('dashboard.indicator.action.publish')">
                <a-button size="small" :disabled="!selectedIndicatorId || selectedIndicatorIsPurchased" @click="handlePublishIndicator"><a-icon type="cloud-upload" /></a-button>
              </a-tooltip>
              <a-tooltip :title="$t('dashboard.indicator.action.createStrategy')">
                <a-button size="small" :disabled="!selectedIndicatorId" @click="handleCreateStrategyFromIndicator"><a-icon type="deployment-unit" /></a-button>
              </a-tooltip>
              <a-tooltip :title="$t('indicatorIde.saveAsNew')">
                <a-button size="small" :disabled="!userId || !currentCode" @click="openSaveAsIndicatorModal"><a-icon type="copy" /></a-button>
              </a-tooltip>
              <a-tooltip :title="chartIndicatorRunning ? $t('indicatorIde.stopIndicatorOnChart') : $t('indicatorIde.runIndicatorOnChart')">
                <a-button
                  size="small"
                  :disabled="chartIndicatorToggleDisabled"
                  @click="toggleChartIndicatorRun"
                >
                  <a-icon :type="chartIndicatorRunning ? 'pause-circle' : 'play-circle'" />
                </a-button>
              </a-tooltip>
            </div>
            <a-icon :type="codePanelExpanded ? 'up' : 'down'" style="margin-left: auto;" />
          </div>
          <div v-show="codePanelExpanded" class="code-panel-body">
            <div class="ide-guide-bar">
              <a-icon type="book" />
              <span>{{ $t('indicatorIde.devGuideTooltip') }}</span>
              <a href="https://github.com/brokermr810/QuantDinger/blob/main/docs/STRATEGY_DEV_GUIDE.md" target="_blank" rel="noopener noreferrer" class="ide-guide-link" @click.stop>
                {{ $t('indicatorIde.devGuide') }} <a-icon type="arrow-right" />
              </a>
            </div>
            <a-alert
              v-if="showPurchasedMarketHint"
              type="info"
              show-icon
              closable
              class="ide-purchased-hint"
              :message="$t('indicatorIde.purchasedIndicatorHintTitle')"
              :description="$t('indicatorIde.purchasedIndicatorHintDesc')"
              @close="dismissPurchasedMarketHint"
            />
            <div class="code-editor-wrapper">
              <div ref="codeEditor" class="code-editor-area"></div>
              <transition name="fade">
                <div
                  v-if="aiGenerating"
                  class="code-ai-overlay"
                >
                  <div class="code-ai-overlay-inner">
                    <a-icon type="loading" spin style="font-size: 22px; color: #1890ff;" />
                    <span>{{ $t('indicatorIde.generating') }}</span>
                    <div class="code-ai-overlay-dots">
                      <span class="dot dot1"></span><span class="dot dot2"></span><span class="dot dot3"></span>
                    </div>
                  </div>
                  <div class="code-ai-overlay-tip">{{ ideAiCurrentTip }}</div>
                </div>
              </transition>
            </div>

            <!-- Code quality (between editor and AI) -->
            <div class="code-quality-panel">
              <div class="code-quality-head">
                <span class="code-quality-title">{{ $t('indicatorIde.codeQualityTitle') }}</span>
                <a-button
                  type="link"
                  size="small"
                  class="code-quality-recheck"
                  :loading="codeQualityLoading"
                  @click="runCodeQualityCheck"
                >{{ $t('indicatorIde.codeQualityRecheck') }}</a-button>
              </div>
              <a-spin v-if="codeQualityLoading" size="small" class="code-quality-spin" />
              <ul v-else-if="sortedCodeQualityHints.length" class="code-quality-list">
                <li
                  v-for="(h, idx) in sortedCodeQualityHints"
                  :key="idx"
                  :class="qualityHintClass(h)"
                >{{ formatQualityHint(h) }}</li>
              </ul>
            </div>

            <div
              v-if="aiDebugSummary"
              class="ai-debug-card"
              :class="`ai-debug-card--${aiDebugState()}`"
            >
              <div class="ai-debug-card__header">
                <div class="ai-debug-card__badge">
                  <a-icon :type="aiDebugStateIcon()" />
                </div>
                <div class="ai-debug-card__headline">
                  <span class="ai-debug-card__tag">AI 质检</span>
                  <span class="ai-debug-card__title">{{ aiDebugSummary.title }}</span>
                </div>
                <a-icon type="close" class="ai-debug-card__dismiss" @click="aiDebugSummary = null" />
              </div>
              <div class="ai-debug-card__chips">
                <span :class="['ai-debug-chip', `ai-debug-chip--${aiDebugState()}`]">{{ aiDebugStateLabel() }}</span>
                <span v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-chip ai-debug-chip--success">
                  <a-icon type="check" style="font-size: 10px;" /> {{ aiDebugSummary.fixed_messages.length }} {{ $t('indicatorIde.fixed') || '已修复' }}
                </span>
                <span v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-chip ai-debug-chip--warning">
                  <a-icon type="eye" style="font-size: 10px;" /> {{ aiDebugSummary.remaining_messages.length }} {{ $t('indicatorIde.toWatch') || '待关注' }}
                </span>
              </div>
              <div v-if="aiDebugSummary.returned_text" class="ai-debug-card__body">
                {{ aiDebugSummary.returned_text }}
              </div>
              <div v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-card__group ai-debug-card__group--fixed">
                <div class="ai-debug-card__group-label"><a-icon type="check-circle" /> {{ $t('indicatorIde.autoFixed') || '已自动修复' }}</div>
                <div v-for="(msg, idx) in aiDebugSummary.fixed_messages" :key="`fixed-${idx}`" class="ai-debug-card__item">
                  <span class="ai-debug-card__bullet ai-debug-card__bullet--green"></span>{{ msg }}
                </div>
              </div>
              <div v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-card__group ai-debug-card__group--remaining">
                <div class="ai-debug-card__group-label"><a-icon type="warning" /> {{ $t('indicatorIde.needAttention') || '仍需关注' }}</div>
                <div v-for="(msg, idx) in aiDebugSummary.remaining_messages" :key="`remaining-${idx}`" class="ai-debug-card__item">
                  <span class="ai-debug-card__bullet ai-debug-card__bullet--orange"></span>{{ msg }}
                </div>
              </div>
            </div>

            <!-- AI Generation Panel -->
            <div class="ai-gen-panel">
              <div class="ai-gen-header" @click="aiPanelExpanded = !aiPanelExpanded">
                <a-icon type="robot" />
                <span>{{ $t('indicatorIde.aiGenerate') }}</span>
                <a-icon :type="aiPanelExpanded ? 'up' : 'down'" style="margin-left: auto;" />
              </div>
              <div v-show="aiPanelExpanded" class="ai-gen-body">
                <div class="ai-helper-tip">{{ $t('indicatorIde.aiAssistHint') }}</div>
                <a-textarea
                  v-model="aiPrompt"
                  class="ai-prompt-input"
                  :placeholder="$t('indicatorIde.aiPromptPlaceholder')"
                  :rows="6"
                  :disabled="aiGenerating || selectedIndicatorIsPurchased"
                  style="resize: vertical;"
                  @pressEnter="handleAIGenerateEnterKey"
                />
                <a-button
                  type="primary"
                  size="small"
                  block
                  :loading="aiGenerating"
                  :disabled="selectedIndicatorIsPurchased"
                  @click="handleAIGenerate"
                  style="margin-top: 8px;"
                >
                  <a-icon v-if="!aiGenerating" type="robot" />
                  {{ aiGenerating ? $t('indicatorIde.generating') : $t('indicatorIde.generateCode') }}
                </a-button>
                <div class="ai-helper-links">
                  <a @click.prevent="goToIndicatorMarket">{{ $t('indicatorIde.goIndicatorMarket') }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right panel (chart + results) -->
      <div class="ide-right">
        <div class="chart-panel" :style="{ flex: 'none', height: chartPanelHeight + 'px' }">
          <kline-chart
            ref="klineChart"
            :symbol="symbol"
            :market="market"
            :timeframe="timeframe"
            :theme="chartTheme"
            :activeIndicators="activeIndicators"
            :userId="userId"
            :realtime-enabled="klineRealtimeEnabled"
            @indicator-toggle="handleIndicatorToggle"
          />
        </div>
        <div
          class="ide-resize-handle"
          @mousedown="startResizePanel"
        >
          <span class="ide-resize-handle-dots"></span>
        </div>
        <div class="result-panel">
          <div class="params-card">
            <div class="params-card-header" @click="paramsPanelExpanded = !paramsPanelExpanded">
              <div class="params-card-title">
                <a-icon type="control" />
                <span>{{ $t('indicatorIde.backtestParameters') }}</span>
              </div>
              <div class="params-card-actions" @click.stop>
                <a-tooltip :title="$t('indicatorIde.history')">
                  <a-button
                    size="small"
                    :disabled="!selectedIndicatorId"
                    @click="showHistoryDrawer = true; historyIndicatorId = selectedIndicatorId"
                  >
                    <a-icon type="history" />
                  </a-button>
                </a-tooltip>
                <a-button
                  type="primary"
                  size="small"
                  :loading="running"
                  :disabled="!canRunBacktest"
                  @click="runBacktest"
                >
                  <a-icon v-if="!running" type="thunderbolt" />
                  {{ $t('indicatorIde.runBacktest') }}
                </a-button>
                <a-icon :type="paramsPanelExpanded ? 'up' : 'down'" @click="paramsPanelExpanded = !paramsPanelExpanded" />
              </div>
            </div>
            <div v-show="paramsPanelExpanded" class="params-scroll params-scroll--right">
              <div class="params-grid">
                <div class="param-section">
                  <div class="param-label">{{ $t('indicatorIde.dateRange') }}</div>
                  <div class="date-presets">
                    <a-button
                      v-for="p in filteredDatePresets"
                      :key="p.key"
                      size="small"
                      :type="datePreset === p.key ? 'primary' : 'default'"
                      @click="applyDatePreset(p)"
                    >{{ p.label }}</a-button>
                  </div>
                  <a-row :gutter="8" style="margin-top: 6px;">
                    <a-col :span="12">
                      <a-date-picker v-model="startDate" :placeholder="$t('indicatorIde.start')" style="width: 100%" size="small" />
                    </a-col>
                    <a-col :span="12">
                      <a-date-picker v-model="endDate" :placeholder="$t('indicatorIde.end')" style="width: 100%" size="small" />
                    </a-col>
                  </a-row>
                </div>

                <div class="param-section">
                  <div class="param-label">{{ $t('indicatorIde.capital') }}</div>
                  <a-row :gutter="8">
                    <a-col :span="12">
                      <div class="field-label">{{ $t('indicatorIde.initialCapital') }}</div>
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
                      <div class="field-label">{{ $t('indicatorIde.leverage') }}</div>
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
                  <a-row :gutter="8" style="margin-top: 6px;">
                    <a-col :span="12">
                      <div class="field-label">{{ $t('indicatorIde.commission') }}</div>
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
                      <div class="field-label">{{ $t('indicatorIde.slippage') }}</div>
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

                <div class="param-section param-section--full">
                  <div class="param-label">{{ $t('indicatorIde.direction') }}</div>
                  <a-radio-group v-model="tradeDirection" class="direction-radio-group">
                    <a-radio-button value="long">
                      <a-icon type="arrow-up" /> {{ $t('indicatorIde.long') }}
                    </a-radio-button>
                    <a-radio-button value="short">
                      <a-icon type="arrow-down" /> {{ $t('indicatorIde.short') }}
                    </a-radio-button>
                    <a-radio-button value="both">
                      <a-icon type="swap" /> {{ $t('indicatorIde.both') }}
                    </a-radio-button>
                  </a-radio-group>
                  <div style="margin-top: 8px;">
                    <a-tooltip :title="$t('indicatorIde.mtfHint')">
                      <a-checkbox v-model="enableMtf">{{ $t('indicatorIde.highPrecisionMtf') }}</a-checkbox>
                    </a-tooltip>
                  </div>
                  <div class="param-strategy-hint">{{ $t('indicatorIde.strategyFromCodeHint') }}</div>
                </div>
              </div>
            </div>
          </div>
          <a-tabs v-model="resultTab" size="small" class="result-tabs" :animated="false">
            <a-tab-pane key="backtest" :tab="$t('indicatorIde.backtestResults')">
              <!-- Running state -->
              <div v-if="running" class="result-running">
                <a-spin size="large" />
                <div class="running-time">{{ fmtElapsed(elapsedSec) }}</div>
                <div class="running-tip">{{ $t('indicatorIde.runningBacktest') }}</div>
              </div>

              <!-- Empty state -->
              <div v-else-if="!hasResult" class="result-empty">
                <a-icon type="bar-chart" style="font-size: 48px; color: #d9d9d9;" />
                <p>{{ $t('indicatorIde.emptyHint') }}</p>
              </div>

              <!-- Results -->
              <div v-else class="result-data">
                <!-- Metric cards -->
                <div class="metrics-grid">
                  <div v-for="m in metricCards" :key="m.label" :class="['metric-card', m.cls]">
                    <div class="metric-label">{{ m.label }}</div>
                    <div class="metric-value">{{ m.value }}</div>
                  </div>
                </div>

                <!-- Equity curve -->
                <div class="eq-section">
                  <div class="eq-title">
                    <a-icon type="area-chart" style="margin-right: 6px;" />
                    {{ $t('indicatorIde.equityCurve') }}
                  </div>
                  <div ref="eqChart" class="equity-chart"></div>
                </div>

                <!-- Trade table -->
                <div class="trades-section">
                  <div class="trades-title">
                    <a-icon type="swap" style="margin-right: 6px;" />
                    {{ $t('indicatorIde.trades') }}
                    <span class="trades-count">({{ pairedTrades.length }})</span>
                  </div>
                  <a-table
                    :columns="tradeColumns"
                    :dataSource="pairedTrades"
                    :pagination="{ pageSize: 8, size: 'small' }"
                    size="small"
                    :scroll="{ x: 820 }"
                    rowKey="id"
                  >
                    <template slot="type" slot-scope="text">
                      <a-tag :color="text === 'long' ? 'green' : 'red'" style="margin: 0;">{{ text.toUpperCase() }}</a-tag>
                    </template>
                    <template slot="exitTag" slot-scope="text, record">
                      <a-tag
                        v-if="record"
                        :color="exitTagColor(record)"
                        style="margin: 0;"
                      >{{ exitTagLabel(record) }}</a-tag>
                    </template>
                    <template slot="price" slot-scope="text">
                      <span style="font-variant-numeric: tabular-nums;">{{ fmtPrice(text) }}</span>
                    </template>
                    <template slot="profit" slot-scope="text">
                      <span :style="{ color: text > 0 ? '#52c41a' : text < 0 ? '#f5222d' : '#666', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }">{{ fmtMoney(text) }}</span>
                    </template>
                    <template slot="money" slot-scope="text">
                      <span style="font-weight: 600; font-variant-numeric: tabular-nums;">{{ fmtMoney(text) }}</span>
                    </template>
                  </a-table>
                </div>

                <!-- AI Optimize CTA -->
                <div v-if="hasResult && !running" class="ai-optimize-card">
                  <div class="ai-optimize-card-inner">
                    <div class="ai-optimize-card-icon">
                      <a-icon type="experiment" />
                    </div>
                    <div class="ai-optimize-card-body">
                      <div class="ai-optimize-card-title">{{ $t('indicatorIde.aiOptimize') }}</div>
                      <div class="ai-optimize-card-desc">{{ $t('indicatorIde.aiOptimizeHint') }}</div>
                    </div>
                    <a-button
                      type="primary"
                      size="small"
                      :loading="aiOptimizing"
                      @click="handleAIOptimize"
                    >
                      <a-icon v-if="!aiOptimizing" type="thunderbolt" />
                      {{ $t('indicatorIde.aiOptimize') }}
                    </a-button>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane key="aisystem" :tab="$t('indicatorIde.aiExperimentTab')">
              <div v-if="!experimentRunning" class="ide-tuning-launch">
                <div class="ide-tuning-launch-header">
                  <div class="ide-tuning-launch-icon"><a-icon type="experiment" /></div>
                  <div>
                    <div class="ide-tuning-launch-title">{{ $t('indicatorIde.tuningLaunchTitle') }}</div>
                    <div class="ide-tuning-launch-subtitle">{{ $t('indicatorIde.tuningLaunchDesc') }}</div>
                  </div>
                </div>

                <div class="ide-tuning-method-cards">
                  <div class="ide-tuning-method-card">
                    <div class="ide-tuning-method-card-head">
                      <a-icon type="deployment-unit" class="ide-tuning-method-icon ide-tuning-method-icon--grid" />
                      <span class="ide-tuning-method-name">{{ $t('indicatorIde.runStructuredTune') }}</span>
                    </div>
                    <div class="ide-tuning-method-desc">{{ $t('indicatorIde.structuredTuneExplain') }}</div>
                    <div class="ide-tuning-method-actions">
                      <a-radio-group v-model="structuredTuneMethod" size="small">
                        <a-radio-button value="grid">{{ $t('indicatorIde.structuredTuneGrid') }}</a-radio-button>
                        <a-radio-button value="random">{{ $t('indicatorIde.structuredTuneRandom') }}</a-radio-button>
                      </a-radio-group>
                      <a-button
                        size="small"
                        :loading="experimentRunning && experimentRunKind === 'structured'"
                        :disabled="experimentRunning"
                        @click="handleRunStructuredTune"
                      >
                        <a-icon type="play-circle" />
                        {{ $t('indicatorIde.runTune') }}
                      </a-button>
                    </div>
                  </div>

                  <div class="ide-tuning-method-card ide-tuning-method-card--ai">
                    <div class="ide-tuning-method-card-head">
                      <a-icon type="robot" class="ide-tuning-method-icon ide-tuning-method-icon--ai" />
                      <span class="ide-tuning-method-name">{{ $t('indicatorIde.runAiExperiment') }}</span>
                      <a-tag color="blue" size="small" style="margin-left: auto;">AI</a-tag>
                    </div>
                    <div class="ide-tuning-method-desc">{{ $t('indicatorIde.aiTuneExplain') }}</div>
                    <div class="ide-tuning-method-actions">
                      <a-button
                        type="primary"
                        size="small"
                        :loading="experimentRunning && experimentRunKind === 'llm'"
                        :disabled="experimentRunning"
                        @click="handleRunAIExperiment"
                      >
                        <a-icon type="thunderbolt" />
                        {{ $t('indicatorIde.runTune') }}
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Running state with real-time progress -->
              <div v-if="experimentRunning" class="experiment-panel">
                <div class="experiment-progress-bar">
                  <div class="experiment-progress-header">
                    <a-spin size="small" />
                    <span v-if="experimentRunKind === 'structured'">{{ $t('indicatorIde.structuredTuneRunning') }}</span>
                    <span v-else>
                      {{ $t('indicatorIde.aiOptimizing') }}
                      <template v-if="experimentCurrentRound > 0">
                        &mdash; {{ $t('indicatorIde.round') }} {{ experimentCurrentRound }}/{{ experimentMaxRounds }}
                      </template>
                    </span>
                    <span class="running-time">{{ fmtElapsed(elapsedSec) }}</span>
                  </div>
                  <div v-if="experimentRunKind === 'llm' && experimentLiveHint" class="experiment-live-hint">{{ experimentLiveHint }}</div>
                  <a-progress
                    v-if="experimentRunKind === 'structured'"
                    :percent="35"
                    status="active"
                    :show-info="false"
                    size="small"
                    strokeColor="#1890ff"
                  />
                  <a-progress
                    v-else
                    :percent="experimentProgressPct"
                    status="active"
                    :show-info="false"
                    size="small"
                    strokeColor="#1890ff"
                  />
                  <div v-if="experimentRoundScores.length" class="experiment-round-scores">
                    <span v-for="(rs, idx) in experimentRoundScores" :key="idx" class="experiment-round-badge" :class="{ best: rs === experimentGlobalBestScoreLive }">
                      R{{ idx + 1 }}: {{ rs.toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else-if="!hasExperimentResult" class="result-empty">
                <a-icon type="experiment" style="font-size: 48px; color: #d9d9d9;" />
                <p>{{ $t('indicatorIde.aiExperimentEmpty') }}</p>
              </div>

              <!-- Results -->
              <div v-else class="experiment-panel">
                <!-- Round progress indicators -->
                <div class="experiment-round-row">
                  <div v-for="(rd, idx) in experimentRoundsInfo" :key="idx" class="experiment-round-card" :class="{ best: rd.globalBestScore === rd.bestScore && rd.bestScore > 0 }">
                    <div class="experiment-round-num">R{{ rd.round }}</div>
                    <div class="experiment-round-detail">
                      <div class="experiment-round-score">{{ rd.bestScore.toFixed(1) }}</div>
                      <div class="experiment-round-meta">{{ rd.candidateCount }} {{ $t('indicatorIde.candidates') }} &middot; {{ rd.elapsed }}s</div>
                    </div>
                  </div>
                </div>

                <!-- Action bar -->
                <div class="experiment-action-bar experiment-action-bar--split">
                  <a-button size="small" @click="handleRunAIExperiment">
                    <a-icon type="experiment" /> {{ $t('indicatorIde.rerunAiTuning') }}
                  </a-button>
                  <a-button size="small" @click="handleRunStructuredTune">
                    <a-icon type="deployment-unit" /> {{ $t('indicatorIde.rerunStructuredTuning') }}
                  </a-button>
                  <a-button size="small" type="primary" @click="applyBestExperimentCandidate">
                    <a-icon type="check" /> {{ $t('indicatorIde.applyBestParams') }}
                  </a-button>
                </div>

                <!-- Hero: regime + best score -->
                <div class="experiment-hero">
                  <div class="experiment-hero-main">
                    <div class="experiment-kicker">{{ $t('indicatorIde.marketRegime') }}</div>
                    <div class="experiment-regime-title">
                      {{ experimentRegimeLabel }}
                      <a-tag color="blue">{{ experimentRegimeConfidence }}</a-tag>
                    </div>
                    <div class="experiment-hint">{{ experimentPromptHint }}</div>
                    <div class="experiment-family-tags">
                      <a-tag v-for="family in experimentPreferredFamilies" :key="family.key" color="purple">{{ family.label }}</a-tag>
                    </div>
                  </div>
                  <div class="experiment-best-score">
                    <div class="experiment-kicker">{{ $t('indicatorIde.bestStrategyOutput') }}</div>
                    <div class="experiment-score">{{ experimentBestScore }}</div>
                    <div class="experiment-grade">{{ experimentBestGrade }}</div>
                  </div>
                </div>

                <!-- Best candidate card -->
                <div v-if="experimentBest" class="experiment-best-card">
                  <div class="experiment-section-title">
                    <a-icon type="trophy" style="margin-right: 6px;" />
                    {{ $t('indicatorIde.bestStrategyOutput') }}
                    <span v-if="experimentBest.name" style="font-weight: 400; margin-left: 8px; font-size: 12px; opacity: 0.65;">{{ experimentBest.name }}</span>
                  </div>
                  <div v-if="experimentBest.reasoning" class="experiment-reasoning">{{ experimentBest.reasoning }}</div>
                  <div class="experiment-best-summary">
                    <div class="experiment-best-metric">
                      <span>{{ $t('indicatorIde.totalReturn') }}</span>
                      <strong>{{ experimentBestSummary.totalReturn }}</strong>
                    </div>
                    <div class="experiment-best-metric">
                      <span>{{ $t('indicatorIde.maxDrawdown') }}</span>
                      <strong>{{ experimentBestSummary.maxDrawdown }}</strong>
                    </div>
                    <div class="experiment-best-metric">
                      <span>{{ $t('indicatorIde.sharpeRatio') }}</span>
                      <strong>{{ experimentBestSummary.sharpeRatio }}</strong>
                    </div>
                    <div class="experiment-best-metric">
                      <span>{{ $t('indicatorIde.tradeCount') }}</span>
                      <strong>{{ experimentBestSummary.totalTrades }}</strong>
                    </div>
                  </div>
                  <div class="experiment-best-actions">
                    <a-button type="primary" size="small" @click="applyBestExperimentCandidate">
                      <a-icon type="check" /> {{ $t('indicatorIde.applyBestParams') }}
                    </a-button>
                  </div>
                </div>

                <!-- Top candidates -->
                <div class="experiment-candidate-grid">
                  <div
                    v-for="candidate in experimentCandidateCards"
                    :key="candidate.name"
                    class="experiment-candidate-card"
                    :class="{ active: experimentSelectedCandidate && experimentSelectedCandidate.name === candidate.name }"
                    @click="selectExperimentCandidate(candidate)"
                  >
                    <div class="experiment-candidate-header">
                      <div>
                        <div class="experiment-candidate-name">{{ candidate.name }}</div>
                        <div class="experiment-candidate-source">{{ formatExperimentSource(candidate.source) }}</div>
                      </div>
                      <a-tag color="blue">{{ ((candidate.score || {}).grade || 'C') }}</a-tag>
                    </div>
                    <div class="experiment-candidate-score">{{ (((candidate.score || {}).overallScore || 0)).toFixed(2) }}</div>
                    <div v-if="candidate.reasoning" class="experiment-candidate-reasoning">{{ candidate.reasoning }}</div>
                    <div class="experiment-candidate-stats">
                      <span>{{ $t('indicatorIde.totalReturn') }} {{ fmtPct((candidate.result || {}).totalReturn) }}</span>
                      <span>{{ $t('indicatorIde.sharpeRatio') }} {{ (((candidate.result || {}).sharpeRatio || 0)).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Selected candidate detail -->
                <div v-if="experimentSelectedCandidate" class="experiment-detail-card">
                  <div class="experiment-detail-header">
                    <div>
                      <div class="experiment-section-title">{{ experimentSelectedCandidate.name }}</div>
                      <div class="experiment-detail-source">{{ formatExperimentSource(experimentSelectedCandidate.source) }}</div>
                      <div v-if="experimentSelectedCandidate.reasoning" class="experiment-reasoning">{{ experimentSelectedCandidate.reasoning }}</div>
                    </div>
                    <div class="experiment-detail-actions">
                      <a-button size="small" @click="applyExperimentCandidate(experimentSelectedCandidate)">
                        <a-icon type="check" /> {{ $t('indicatorIde.applyThisCandidate') }}
                      </a-button>
                      <a-button size="small" type="primary" @click="runBacktestWithExperimentCandidate(experimentSelectedCandidate)">
                        <a-icon type="thunderbolt" /> {{ $t('indicatorIde.backtestThisCandidate') }}
                      </a-button>
                    </div>
                  </div>
                  <div class="experiment-detail-metrics">
                    <div v-for="item in experimentSelectedSummary" :key="item.label" class="experiment-detail-metric">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                  </div>
                  <div v-if="experimentSelectedScoreComponents.length" class="experiment-detail-block">
                    <div class="experiment-detail-block-title">{{ $t('indicatorIde.scoreBreakdown') }}</div>
                    <div class="experiment-component-grid">
                      <div v-for="item in experimentSelectedScoreComponents" :key="item.key" class="experiment-component-card">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Ranking table -->
                <div class="experiment-ranking-card">
                  <div class="experiment-section-title">
                    <a-icon type="ordered-list" style="margin-right: 6px;" />
                    {{ $t('indicatorIde.strategyRanking') }}
                  </div>
                  <a-table
                    :columns="experimentColumns"
                    :dataSource="experimentRankedStrategies"
                    :pagination="{ pageSize: 5, size: 'small' }"
                    size="small"
                    rowKey="name"
                    :scroll="{ x: 760 }"
                  >
                    <template slot="experimentName" slot-scope="text, record">
                      <div>
                        <div class="exp-table-name">{{ text }}</div>
                        <div class="exp-table-source">{{ formatExperimentSource(record.source) }}</div>
                      </div>
                    </template>
                    <template slot="experimentScore" slot-scope="text, record">
                      <span class="exp-table-score">{{ ((record.score || {}).overallScore || 0).toFixed(2) }}</span>
                    </template>
                    <template slot="experimentGrade" slot-scope="text, record">
                      <a-tag :color="((record.score || {}).grade || 'C') === 'A' ? 'green' : ((record.score || {}).grade || 'C') === 'B' ? 'blue' : 'orange'">
                        {{ (record.score || {}).grade || 'C' }}
                      </a-tag>
                    </template>
                    <template slot="experimentReturn" slot-scope="text, record">
                      <span :style="{ color: (((record.result || {}).totalReturn || 0) >= 0) ? '#52c41a' : '#f5222d', fontWeight: 600 }">
                        {{ fmtPct((record.result || {}).totalReturn) }}
                      </span>
                    </template>
                    <template slot="experimentDrawdown" slot-scope="text, record">
                      <span>{{ fmtPct((record.result || {}).maxDrawdown) }}</span>
                    </template>
                    <template slot="experimentSharpe" slot-scope="text, record">
                      <span>{{ (((record.result || {}).sharpeRatio || 0)).toFixed(2) }}</span>
                    </template>
                    <template slot="experimentTrades" slot-scope="text, record">
                      <span>{{ (record.result || {}).totalTrades || 0 }}</span>
                    </template>
                  </a-table>
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>

      <!-- 闪电交易：与左侧代码区相同，主布局内右侧抽拉（非全屏悬浮） -->
      <div v-show="quickTradeDrawerVisible" class="ide-quick-right">
        <div class="ide-quick-panel-head">
          <span class="ide-quick-panel-head-title">
            <a-icon type="thunderbolt" theme="filled" class="ide-quick-panel-head-icon" />
            {{ $t('quickTrade.title') }}
          </span>
          <a-button type="link" size="small" class="ide-quick-panel-close" @click="closeQuickTradeDrawer">
            <a-icon type="close" />
          </a-button>
        </div>
        <div class="ide-quick-panel-body">
          <quick-trade-panel
            key="ide-embedded-qt"
            embedded
            embedded-ide
            :visible="true"
            :symbol="qtSymbol"
            :preset-side="qtSide"
            :preset-price="qtPrice"
            source="indicator"
            market-type="swap"
            @order-success="onQuickTradeSuccess"
            @update:symbol="handleQuickTradeSymbolChange"
          />
        </div>
      </div>

    </div>

    <!-- Add symbol modal -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddModal"
      @ok="handleAddStock"
      @cancel="showAddModal = false"
      :confirmLoading="addingStock"
      width="560px"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
    >
      <a-tabs v-model="addMarketTab" size="small" class="ide-add-market-tabs" @change="onAddMarketTabChange">
        <a-tab-pane
          v-for="m in ideAddMarketKeys"
          :key="m"
          :tab="$t('dashboard.indicator.market.' + m)"
        ></a-tab-pane>
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

    <!-- History drawer + run viewer -->
    <backtest-history-drawer
      :visible="showHistoryDrawer"
      :userId="userId"
      :indicatorId="historyIndicatorId"
      :strategyId="null"
      :runType="''"
      :isMobile="false"
      :isDark="isDarkTheme"
      @cancel="showHistoryDrawer = false"
      @view="applyBacktestRunToIde"
    />
    <a-modal
      :title="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.editTitle') : $t('dashboard.indicator.publish.title')"
      :visible="showPublishModal"
      :confirmLoading="publishing"
      :okText="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.update') : $t('dashboard.indicator.publish.confirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
      @ok="handleConfirmPublish"
      @cancel="showPublishModal = false; publishIndicator = null"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px;"
        :message="$t('dashboard.indicator.publish.hint')"
      />
      <div class="publish-form">
        <div class="field-label">{{ $t('dashboard.indicator.publish.pricingType') }}</div>
        <a-radio-group v-model="publishPricingType">
          <a-radio value="free">{{ $t('dashboard.indicator.publish.free') }}</a-radio>
          <a-radio value="paid">{{ $t('dashboard.indicator.publish.paid') }}</a-radio>
        </a-radio-group>
        <div v-if="publishPricingType === 'paid'" style="margin-top: 12px;">
          <div class="field-label">{{ $t('dashboard.indicator.publish.price') }}</div>
          <a-input-number v-model="publishPrice" :min="0" :precision="2" style="width: 100%" />
          <div style="margin-top: 10px;">
            <a-switch v-model="publishVipFree" />
            <span style="margin-left: 8px;">{{ $t('dashboard.indicator.publish.vipFree') }}</span>
          </div>
          <div class="publish-hint">{{ $t('dashboard.indicator.publish.vipFreeHint') }}</div>
        </div>
        <div style="margin-top: 12px;">
          <div class="field-label">{{ $t('dashboard.indicator.publish.description') }}</div>
          <a-textarea
            v-model="publishDescription"
            :rows="4"
            :placeholder="$t('dashboard.indicator.publish.descriptionPlaceholder')"
          />
        </div>
        <div v-if="publishIndicator && publishIndicator.publish_to_community" style="margin-top: 16px;">
          <a-button type="danger" ghost @click="handleUnpublish" :loading="unpublishing">
            {{ $t('dashboard.indicator.publish.unpublish') }}
          </a-button>
        </div>
      </div>
    </a-modal>
    <a-modal
      :title="$t('indicatorIde.saveAsModalTitle')"
      :visible="showSaveAsModal"
      :confirmLoading="savingAs"
      :okText="$t('indicatorIde.saveAsConfirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
      @ok="confirmSaveAsIndicator"
      @cancel="showSaveAsModal = false"
    >
      <div class="field-label" style="margin-bottom: 8px;">{{ $t('indicatorIde.saveAsNameLabel') }}</div>
      <a-input
        v-model="saveAsName"
        :placeholder="$t('indicatorIde.saveAsNamePlaceholder')"
        @pressEnter="confirmSaveAsIndicator"
      />
    </a-modal>
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import * as echarts from 'echarts'
import moment from 'moment'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { baseMixin } from '@/store/app-mixin'
import request from '@/utils/request'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import KlineChart from '@/views/indicator-analysis/components/KlineChart.vue'
import BacktestHistoryDrawer from '@/views/indicator-analysis/components/BacktestHistoryDrawer.vue'
import QuickTradePanel from '@/components/QuickTradePanel/QuickTradePanel'
import { Modal } from 'ant-design-vue'

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
  { key: '3y', label: '3Y', days: 1095 }
]

/** 与指标分析 / AI 资产分析一致的市场列表（含 A 股、H 股、预测市场） */
const IDE_ADD_MARKET_KEYS = ['Crypto', 'USStock', 'CNStock', 'HKStock', 'Forex', 'Futures', 'PredictionMarket']

function purchasedMarketHintStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_ide_purchased_market_hint_dismissed_${u}`
}

function ideUiCacheStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_ide_ui_cache_v1_${u}`
}

export default {
  name: 'IndicatorIDE',
  mixins: [baseMixin],
  components: { KlineChart, BacktestHistoryDrawer, QuickTradePanel },
  data () {
    return {
      userId: null,
      indicators: [],
      loadingIndicators: false,
      selectedIndicatorId: undefined,
      currentCode: '',
      codeDirty: false,
      cmInstance: null,

      codeDrawerVisible: true,
      codePanelExpanded: true,
      paramsPanelExpanded: true,
      /** 已购指标说明条：用户关闭后按账号写入 storage，不再展示 */
      purchasedMarketHintDismissed: false,

      chartPanelHeight: 340,
      resizeDragStartY: 0,
      resizeDragStartH: 0,

      market: 'Crypto',
      symbol: 'BTC/USDT',
      timeframe: '1D',
      watchlist: [],
      selectedWatchlistKey: 'Crypto:BTC/USDT',

      initialCapital: 10000,
      leverage: 1,
      commission: 0.02,
      slippage: 0.02,
      tradeDirection: 'long',
      enableMtf: false,

      startDate: moment().subtract(6, 'months'),
      endDate: moment(),
      datePreset: '6m',

      running: false,
      runTip: '',
      hasResult: false,
      result: {},
      backtestRunId: null,

      activeIndicators: [],
      /** 是否在 K 线图上运行当前指标（关闭后仅保留 K 线，不计算/绘制指标） */
      chartIndicatorRunning: true,
      resultTab: 'backtest',
      quickTradeDrawerVisible: false,

      // AI generation
      aiPanelExpanded: true,
      aiPrompt: '',
      aiGenerating: false,
      aiDebugSummary: null,
      ideAiTipIndex: 0,
      ideAiTipTimer: null,
      ideAiTips: [
        '正在分析需求，构建最优指标逻辑…',
        'AI 可自动添加 @strategy 注解，写入推荐的风控与仓位（杠杆在回测面板单独设置）',
        '生成完成后可一键运行回测',
        '创建实盘策略时会携带当前代码与解析出的策略配置',
        '使用 @param 声明可调参数，方便智能调参',
        '边缘触发信号避免重复开仓，提升策略稳定性'
      ],
      codeQualityHints: [],
      codeQualityLoading: false,

      aiOptimizing: false,
      experimentRunning: false,
      /** 'llm' | 'structured' — which run is in progress / last explicit choice for UX */
      experimentRunKind: 'llm',
      structuredTuneMethod: 'grid',
      experimentResult: null,
      experimentError: '',
      experimentSelectedCandidateName: '',
      experimentCurrentRound: 0,
      experimentMaxRounds: 3,
      experimentRoundScores: [],
      experimentGlobalBestScoreLive: 0,
      experimentAbortController: null,
      experimentLiveHint: '',

      // Quick Trade drawer reuse
      qtSymbol: 'BTC/USDT',
      qtSide: '',
      qtPrice: 0,

      creatingIndicator: false,
      deletingIndicator: false,
      showPublishModal: false,
      showSaveAsModal: false,
      saveAsName: '',
      savingAs: false,
      publishIndicator: null,
      publishing: false,
      unpublishing: false,
      publishPricingType: 'free',
      publishPrice: 10,
      publishDescription: '',
      publishVipFree: false,

      showAddModal: false,
      addingStock: false,
      addMarketTab: 'Crypto',
      addSearchKeyword: '',
      addSearchResults: [],
      addSelectedItem: null,
      addSearching: false,
      addSearched: false,
      addSearchTimer: null,

      showHistoryDrawer: false,
      historyIndicatorId: null,

      ideAddMarketKeys: IDE_ADD_MARKET_KEYS,

      eqChartInstance: null,
      elapsedSec: 0,
      elapsedTimer: null
    }
  },
  computed: {
    sortedCodeQualityHints () {
      const order = { error: 0, warn: 1, info: 2 }
      return [...(this.codeQualityHints || [])].sort(
        (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
      )
    },
    ideAiCurrentTip () {
      return this.ideAiTips[this.ideAiTipIndex] || ''
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    chartTheme () {
      return this.isDarkTheme ? 'dark' : 'light'
    },
    /** 有标的时开启 K 线轮询更新（与指标分析页一致） */
    klineRealtimeEnabled () {
      return !!(this.symbol && String(this.symbol).trim())
    },
    canRunBacktest () {
      return this.selectedIndicatorId && this.symbol && this.startDate && this.endDate
    },
    selectedIndicatorObj () {
      return this.selectedIndicatorId ? this.indicators.find(i => i.id === this.selectedIndicatorId) : null
    },
    /** 指标市场购买的副本：后端禁止覆盖保存，前端只读展示，可回测 / 另存为后编辑 */
    selectedIndicatorIsPurchased () {
      const o = this.selectedIndicatorObj
      if (!o) return false
      return Number(o.is_buy) === 1
    },
    tfMaxDays () {
      return TF_MAX_DAYS[this.timeframe] || 3650
    },
    filteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.tfMaxDays)
    },
    hasExperimentResult () {
      return !!(this.experimentResult && Array.isArray(this.experimentResult.rankedStrategies) && this.experimentResult.rankedStrategies.length)
    },
    experimentRankedStrategies () {
      return (this.experimentResult && this.experimentResult.rankedStrategies) || []
    },
    experimentSelectedCandidate () {
      const items = this.experimentRankedStrategies
      if (!items.length) return null
      return items.find(item => item.name === this.experimentSelectedCandidateName) || items[0]
    },
    experimentBest () {
      return (this.experimentResult && this.experimentResult.bestStrategyOutput) || null
    },
    experimentRegime () {
      return (this.experimentResult && this.experimentResult.regime) || null
    },
    experimentRegimeLabel () {
      const regime = this.experimentRegime
      return regime ? this.translateExperimentRegime(regime.regime || regime.label || '') : '--'
    },
    experimentRegimeConfidence () {
      const regime = this.experimentRegime
      return regime ? `${Math.round(Number(regime.confidence || 0) * 100)}%` : '--'
    },
    experimentPreferredFamilies () {
      return ((this.experimentResult && this.experimentResult.generatorHints && this.experimentResult.generatorHints.preferredFamilies) || [])
        .slice(0, 4)
        .map(key => ({ key, label: this.translateExperimentFamily(key) }))
    },
    experimentPromptHint () {
      const regimeLabel = this.experimentRegimeLabel
      const familyLabels = this.experimentPreferredFamilies.map(item => item.label)
      const mode = (this.experimentResult && this.experimentResult.experiment && this.experimentResult.experiment.mode) || ''
      if (!familyLabels.length) {
        if (mode === 'structured') return this.$t('indicatorIde.structuredTuneResultHint')
        return this.$t('indicatorIde.aiExperimentEmpty')
      }
      return this.$t('indicatorIde.experimentPromptHint', {
        regime: regimeLabel,
        families: familyLabels.join(' / ')
      })
    },
    experimentBestScore () {
      const score = this.experimentBest && this.experimentBest.score
      return score ? (Number(score.overallScore || 0)).toFixed(2) : '--'
    },
    experimentBestGrade () {
      const score = this.experimentBest && this.experimentBest.score
      return score ? (score.grade || 'C') : '--'
    },
    experimentBestSummary () {
      const summary = (this.experimentBest && this.experimentBest.summary) || {}
      return {
        totalReturn: summary.totalReturn == null ? '--' : this.fmtPct(summary.totalReturn),
        maxDrawdown: summary.maxDrawdown == null ? '--' : this.fmtPct(summary.maxDrawdown),
        sharpeRatio: summary.sharpeRatio == null ? '--' : Number(summary.sharpeRatio || 0).toFixed(2),
        totalTrades: summary.totalTrades == null ? '--' : String(summary.totalTrades)
      }
    },
    experimentFeatureMap () {
      const features = (this.experimentRegime && this.experimentRegime.features) || {}
      return {
        priceChangePct: features.priceChangePct == null ? '--' : this.fmtPct(features.priceChangePct),
        realizedVolPct: features.realizedVolPct == null ? '--' : this.fmtPct(features.realizedVolPct),
        atrPct: features.atrPct == null ? '--' : this.fmtPct(features.atrPct),
        directionalEfficiency: features.directionalEfficiency == null ? '--' : Number(features.directionalEfficiency || 0).toFixed(2)
      }
    },
    experimentBestOverrides () {
      const overrides = (this.experimentBest && this.experimentBest.overrides) || {}
      return Object.keys(overrides).map(key => ({
        key,
        label: `${this.humanizeExperimentKey(key)}: ${this.formatExperimentOverrideValue(key, overrides[key])}`
      }))
    },
    experimentSelectedOverrides () {
      const overrides = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.overrides) || {}
      return Object.keys(overrides).map(key => ({
        key,
        label: `${this.humanizeExperimentKey(key)}: ${this.formatExperimentOverrideValue(key, overrides[key])}`
      }))
    },
    experimentSelectedSummary () {
      const result = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.result) || {}
      const score = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.score) || {}
      return [
        { label: this.$t('indicatorIde.score'), value: ((score.overallScore || 0)).toFixed(2) },
        { label: this.$t('indicatorIde.grade'), value: score.grade || '--' },
        { label: this.$t('indicatorIde.totalReturn'), value: this.fmtPct(result.totalReturn) },
        { label: this.$t('indicatorIde.maxDrawdown'), value: this.fmtPct(result.maxDrawdown) },
        { label: this.$t('indicatorIde.sharpeRatio'), value: ((result.sharpeRatio || 0)).toFixed(2) },
        { label: this.$t('indicatorIde.tradeCount'), value: String(result.totalTrades || 0) }
      ]
    },
    experimentSelectedScoreComponents () {
      const components = ((this.experimentSelectedCandidate && this.experimentSelectedCandidate.score) || {}).components || {}
      return Object.keys(components).slice(0, 6).map(key => ({
        key,
        label: this.humanizeExperimentScoreKey(key),
        value: Number(components[key] || 0).toFixed(2)
      }))
    },
    experimentRoundsInfo () {
      return ((this.experimentResult && this.experimentResult.rounds) || []).map(r => ({
        round: r.round || 0,
        bestScore: r.bestScore || 0,
        globalBestScore: r.globalBestScore || 0,
        candidateCount: r.candidateCount || 0,
        elapsed: r.elapsed || 0,
        error: r.error || null
      }))
    },
    experimentProgressPct () {
      if (!this.experimentMaxRounds) return 0
      if (this.experimentRunKind !== 'llm') return 0
      // 市场状态检测阶段尚未进入第 1 轮时给少量进度，避免进度条长时间为 0
      if (this.experimentRunning && this.experimentCurrentRound < 1) {
        return 6
      }
      return Math.min(100, Math.round((this.experimentCurrentRound / this.experimentMaxRounds) * 100))
    },
    experimentSegmentList () {
      return (this.experimentRegime && this.experimentRegime.segments) || []
    },
    experimentCandidateCards () {
      return this.experimentRankedStrategies.slice(0, 6)
    },
    experimentColumns () {
      return [
        { title: '#', dataIndex: 'rank', width: 50 },
        { title: this.$t('indicatorIde.strategyCandidate'), dataIndex: 'name', scopedSlots: { customRender: 'experimentName' }, width: 180 },
        { title: this.$t('indicatorIde.score'), dataIndex: 'score', scopedSlots: { customRender: 'experimentScore' }, width: 90 },
        { title: this.$t('indicatorIde.grade'), dataIndex: 'grade', scopedSlots: { customRender: 'experimentGrade' }, width: 80 },
        { title: this.$t('indicatorIde.totalReturn'), dataIndex: 'totalReturn', scopedSlots: { customRender: 'experimentReturn' }, width: 110 },
        { title: this.$t('indicatorIde.maxDrawdown'), dataIndex: 'maxDrawdown', scopedSlots: { customRender: 'experimentDrawdown' }, width: 110 },
        { title: this.$t('indicatorIde.sharpeRatio'), dataIndex: 'sharpeRatio', scopedSlots: { customRender: 'experimentSharpe' }, width: 90 },
        { title: this.$t('indicatorIde.tradeCount'), dataIndex: 'totalTrades', scopedSlots: { customRender: 'experimentTrades' }, width: 90 }
      ]
    },
    metricCards () {
      const r = this.result || {}
      return [
        { label: this.$t('indicatorIde.totalReturn'), value: this.fmtPct(r.totalReturn), cls: (r.totalReturn || 0) >= 0 ? 'positive' : 'negative' },
        { label: this.$t('indicatorIde.maxDrawdown'), value: this.fmtPct(r.maxDrawdown), cls: 'negative' },
        { label: this.$t('indicatorIde.sharpeRatio'), value: (r.sharpeRatio || 0).toFixed(2), cls: (r.sharpeRatio || 0) >= 1 ? 'positive' : '' },
        { label: this.$t('indicatorIde.winRate'), value: this.fmtPct(r.winRate), cls: (r.winRate || 0) >= 50 ? 'positive' : '' },
        { label: this.$t('indicatorIde.profitFactor'), value: (r.profitFactor || 0).toFixed(2), cls: (r.profitFactor || 0) >= 1.5 ? 'positive' : '' },
        { label: this.$t('indicatorIde.tradeCount'), value: String(r.totalTrades || 0), cls: '' }
      ]
    },
    chartIndicatorToggleDisabled () {
      if (this.chartIndicatorRunning) return false
      return !this.selectedIndicatorId || !(this.currentCode && String(this.currentCode).trim())
    },
    pairedTrades () {
      const raw = (this.result && this.result.trades) || []
      const pairs = []
      let openTrade = null
      let idx = 1
      for (let i = 0; i < raw.length; i++) {
        const t = raw[i]
        const ty = (t.type || '').toLowerCase()
        if (ty.startsWith('open_') || ty === 'buy') {
          openTrade = t
        } else if (openTrade) {
          const direction = openTrade.type.includes('long') || openTrade.type === 'buy' ? 'long' : 'short'
          pairs.push({
            id: idx++,
            type: direction,
            closeType: t.type || '',
            closeReason: t.reason || t.close_reason || '',
            entryDate: openTrade.time || '',
            exitDate: t.time || '',
            entryPrice: openTrade.price,
            exitPrice: t.price,
            profit: t.profit || 0,
            balance: t.balance != null ? t.balance : 0
          })
          openTrade = null
        }
      }
      return pairs
    },
    tradeColumns () {
      return [
        { title: '#', dataIndex: 'id', width: 50 },
        { title: this.$t('indicatorIde.type'), dataIndex: 'type', scopedSlots: { customRender: 'type' }, width: 80 },
        { title: this.$t('indicatorIde.exitTag'), dataIndex: 'closeType', scopedSlots: { customRender: 'exitTag' }, width: 108 },
        { title: this.$t('indicatorIde.entry'), dataIndex: 'entryDate', width: 140 },
        { title: this.$t('indicatorIde.exit'), dataIndex: 'exitDate', width: 140 },
        { title: this.$t('indicatorIde.entryPrice'), dataIndex: 'entryPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('indicatorIde.exitPrice'), dataIndex: 'exitPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('indicatorIde.profit'), dataIndex: 'profit', scopedSlots: { customRender: 'profit' }, width: 120 },
        { title: this.$t('indicatorIde.balance'), dataIndex: 'balance', scopedSlots: { customRender: 'money' }, width: 130 }
      ]
    },
    showPurchasedMarketHint () {
      return this.selectedIndicatorIsPurchased && !this.purchasedMarketHintDismissed
    }
  },
  async created () {
    await this.loadUserId()
    this.loadPurchasedMarketHintDismissed()
    await this.loadIndicators()
    await this.loadWatchlist()
    this.restoreIdeUiState()
    this.autoSelectFirstIndicator()
  },
  mounted () {
    this.$nextTick(() => {
      this.initCodeMirror()
      this.ensureChartReady()
    })
  },
  beforeDestroy () {
    if (this._persistIdeUiTimer) {
      clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = null
    }
    this.persistIdeUiState()
    if (this.cmInstance) {
      this.cmInstance.toTextArea()
      this.cmInstance = null
    }
    if (this.eqChartInstance) {
      this.eqChartInstance.dispose()
      this.eqChartInstance = null
    }
    clearInterval(this.elapsedTimer)
    clearTimeout(this.addSearchTimer)
    if (this.ideAiTipTimer) clearInterval(this.ideAiTipTimer)
    if (this.experimentAbortController) {
      try { this.experimentAbortController.abort() } catch (_) {}
      this.experimentAbortController = null
    }
    window.removeEventListener('resize', this._onResize)
  },
  methods: {
    // ===== Data loading =====
    async loadUserId () {
      try {
        const res = await getUserInfo()
        if (res && res.data) this.userId = res.data.id || res.data.user_id || 1
      } catch {
        this.userId = 1
      }
    },

    loadPurchasedMarketHintDismissed () {
      try {
        const raw = storage.get(purchasedMarketHintStorageKey(this.userId))
        this.purchasedMarketHintDismissed =
          raw === true || raw === 1 || raw === '1' || raw === 'true'
      } catch (_) {
        this.purchasedMarketHintDismissed = false
      }
    },

    dismissPurchasedMarketHint () {
      this.purchasedMarketHintDismissed = true
      try {
        storage.set(purchasedMarketHintStorageKey(this.userId), '1')
      } catch (_) { /* ignore quota */ }
    },

    restoreIdeUiState () {
      if (!this.userId) return
      try {
        const raw = storage.get(ideUiCacheStorageKey(this.userId))
        if (raw == null || raw === '') return
        const s = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!s || typeof s !== 'object') return
        if (Array.isArray(s.activeIndicators)) {
          this.activeIndicators = this.normalizePersistedChartIndicators(s.activeIndicators)
        }
        if (s.timeframe && Object.prototype.hasOwnProperty.call(TF_MAX_DAYS, s.timeframe)) {
          this.timeframe = s.timeframe
        }
        if (s.market && s.symbol) {
          this.market = String(s.market)
          this.symbol = String(s.symbol)
          this.qtSymbol = this.symbol
          this.selectedWatchlistKey = `${this.market}:${this.symbol}`
        } else if (s.selectedWatchlistKey && typeof s.selectedWatchlistKey === 'string') {
          const [m, sym] = s.selectedWatchlistKey.split(':')
          if (m && sym) {
            this.market = m
            this.symbol = sym
            this.qtSymbol = sym
            this.selectedWatchlistKey = s.selectedWatchlistKey
          }
        }
        if (s.selectedIndicatorId != null && s.selectedIndicatorId !== '') {
          const id = Number(s.selectedIndicatorId)
          if (!isNaN(id) && this.indicators.some(i => Number(i.id) === id)) {
            this.selectedIndicatorId = id
            this.onIndicatorChange(id)
          }
        }
      } catch (_) { /* ignore corrupt cache */ }
    },

    schedulePersistIdeUiState () {
      if (this._persistIdeUiTimer) clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = setTimeout(() => {
        this._persistIdeUiTimer = null
        this.persistIdeUiState()
      }, 250)
    },

    persistIdeUiState () {
      if (!this.userId) return
      try {
        const payload = {
          market: this.market,
          symbol: this.symbol,
          timeframe: this.timeframe,
          selectedIndicatorId: this.selectedIndicatorId,
          selectedWatchlistKey: this.selectedWatchlistKey,
          activeIndicators: this.serializeChartIndicators()
        }
        storage.set(ideUiCacheStorageKey(this.userId), JSON.stringify(payload))
      } catch (_) { /* ignore quota */ }
    },
    normalizePersistedChartIndicators (items) {
      if (!Array.isArray(items)) return []
      return items
        .filter(item => item && item.id && item.id !== 'selected-python-indicator' && item.type !== 'python')
        .map(item => ({
          id: item.id,
          instanceId: item.instanceId || `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: item.name,
          shortName: item.shortName,
          type: item.type,
          visible: item.visible !== false,
          params: item.params && typeof item.params === 'object' ? { ...item.params } : {},
          style: item.style && typeof item.style === 'object'
            ? { color: item.style.color || '', lineWidth: Number(item.style.lineWidth || 2) }
            : { color: '', lineWidth: 2 }
        }))
    },
    serializeChartIndicators () {
      return this.normalizePersistedChartIndicators(this.activeIndicators)
    },

    async loadIndicators () {
      if (!this.userId) return
      this.loadingIndicators = true
      try {
        const res = await request({ url: '/api/indicator/getIndicators', method: 'get', params: { userid: this.userId } })
        if (res && res.data && Array.isArray(res.data)) {
          this.indicators = res.data.map(item => ({ ...item, type: 'python' }))
        }
      } catch (e) {
        console.warn('Load indicators failed:', e)
      } finally {
        this.loadingIndicators = false
      }
    },
    async loadWatchlist () {
      if (!this.userId) return
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) this.watchlist = res.data
      } catch { /* silent */ }
    },

    autoSelectFirstIndicator () {
      if (this.indicators.length > 0 && !this.selectedIndicatorId) {
        this.selectedIndicatorId = this.indicators[0].id
        this.onIndicatorChange(this.indicators[0].id)
      }
    },
    ensureChartReady () {
      this.$nextTick(() => {
        setTimeout(() => {
          const chart = this.$refs.klineChart
          if (!chart || !this.symbol) return
          if (!chart.chartRef && typeof chart.initChart === 'function') {
            chart.initChart()
          }
          if (typeof chart.loadKlineData === 'function') {
            chart.loadKlineData()
          }
          if (this.selectedIndicatorId) {
            this.syncSelectedIndicatorToChart()
          }
        }, 300)
      })
    },

    // ===== CodeMirror =====
    initCodeMirror () {
      const el = this.$refs.codeEditor
      if (!el) return
      if (this.cmInstance) {
        this.cmInstance.toTextArea()
        this.cmInstance = null
      }
      const textarea = document.createElement('textarea')
      el.innerHTML = ''
      el.appendChild(textarea)
      this.cmInstance = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: this.isDarkTheme ? 'monokai' : 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false
      })
      this.cmInstance.setValue(this.currentCode)
      this.cmInstance.on('change', (cm) => {
        const val = cm.getValue()
        if (val !== this.currentCode) {
          this.currentCode = val
          this.codeDirty = true
        }
      })
      this.cmInstance.refresh()
      this.applyCodeMirrorReadOnly()
    },
    applyCodeMirrorReadOnly () {
      if (!this.cmInstance) return
      const ro = this.selectedIndicatorIsPurchased
      this.cmInstance.setOption('readOnly', ro)
      this.cmInstance.refresh()
    },
    onIndicatorChange (id) {
      const ind = this.indicators.find(i => i.id === id)
      if (ind) {
        this.currentCode = ind.code || ''
        this.codeDirty = false
        if (this.cmInstance) {
          this.cmInstance.setValue(this.currentCode)
        }
        this.syncSelectedIndicatorToChart(ind.code || '')
        this.syncTradeUiFromStrategyCode(ind.code || '', { silent: true })
      } else {
        this.currentCode = ''
        this.codeDirty = false
        this.activeIndicators = this.activeIndicators.filter(item => item.id !== 'selected-python-indicator')
        if (this.cmInstance) {
          this.cmInstance.setValue('')
        }
      }
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    buildSelectedIndicatorForChart (codeOverride) {
      const ind = this.selectedIndicatorObj
      if (!ind) return null
      const chart = this.$refs.klineChart
      const code = typeof codeOverride === 'string' ? codeOverride : (this.currentCode || ind.code || '')
      if (!code || !chart || typeof chart.executePythonStrategy !== 'function') return null
      return {
        ...ind,
        id: 'selected-python-indicator',
        originalId: ind.id,
        type: 'python',
        code,
        params: {},
        calculate: async (klineData, params = {}) => {
          return chart.executePythonStrategy(code, klineData, params, {
            ...ind,
            originalId: ind.id,
            id: ind.id,
            userId: this.userId
          })
        }
      }
    },
    syncSelectedIndicatorToChart (codeOverride) {
      const nonSelectedIndicators = this.activeIndicators.filter(item => item.id !== 'selected-python-indicator')
      const selectedIndicator =
        this.chartIndicatorRunning && this.selectedIndicatorObj
          ? this.buildSelectedIndicatorForChart(codeOverride)
          : null
      this.activeIndicators = selectedIndicator
        ? [...nonSelectedIndicators, selectedIndicator]
        : nonSelectedIndicators
      this.$nextTick(() => {
        const chart = this.$refs.klineChart
        if (chart && typeof chart.updateIndicators === 'function') {
          chart.updateIndicators()
        }
      })
    },
    toggleChartIndicatorRun () {
      if (!this.chartIndicatorRunning && this.chartIndicatorToggleDisabled) return
      this.chartIndicatorRunning = !this.chartIndicatorRunning
      this.syncSelectedIndicatorToChart()
    },
    handleIndicatorToggle ({ action, indicator }) {
      if (!indicator || !indicator.id) return
      const targetInstanceId = indicator.instanceId || indicator.id
      if (action === 'add') {
        this.activeIndicators = [...this.activeIndicators, { ...indicator, instanceId: targetInstanceId, calculate: null }]
      } else if (action === 'update') {
        this.activeIndicators = this.activeIndicators.map(item => {
          if ((item.instanceId || item.id) !== targetInstanceId) return item
          return {
            ...item,
            ...indicator,
            instanceId: targetInstanceId,
            params: indicator.params && typeof indicator.params === 'object' ? { ...indicator.params } : (item.params || {}),
            style: indicator.style && typeof indicator.style === 'object'
              ? { color: indicator.style.color || '', lineWidth: Number(indicator.style.lineWidth || 2) }
              : (item.style || { color: '', lineWidth: 2 }),
            calculate: null
          }
        })
      } else if (action === 'remove') {
        this.activeIndicators = this.activeIndicators.filter(item => (item.instanceId || item.id) !== targetInstanceId)
      }
      this.syncSelectedIndicatorToChart()
    },

    // ===== Save =====
    openSaveAsIndicatorModal () {
      const base =
        (this.selectedIndicatorObj && this.selectedIndicatorObj.name) ||
        this.$t('indicatorIde.saveAsDefaultName')
      this.saveAsName = `${base}${this.$t('indicatorIde.nameCopySuffix')}`
      this.showSaveAsModal = true
    },
    async confirmSaveAsIndicator () {
      if (!this.userId) return
      const name = (this.saveAsName || '').trim()
      if (!name) {
        this.$message.warning(this.$t('indicatorIde.saveAsNameRequired'))
        return
      }
      const code = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      if (!code || !String(code).trim()) {
        this.$message.warning(this.$t('indicatorIde.saveAsNeedCode'))
        return
      }
      this.savingAs = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: { userid: this.userId, id: 0, code, name }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            this.selectedIndicatorId = targetId
            this.onIndicatorChange(targetId)
            this.codeDirty = false
            this.showSaveAsModal = false
            this.$message.success(this.$t('indicatorIde.saveAsSuccess'))
          } else {
            this.$message.error(this.$t('indicatorIde.saveAsFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.saveAsFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.saveAsFailed') + ': ' + (e.message || ''))
      } finally {
        this.savingAs = false
      }
    },
    clearBacktestSignalOverlays (opts = {}) {
      const silent = !!(opts && opts.silent)
      const chart = this.$refs.klineChart
      if (!chart || !chart.chartRef) {
        if (!silent) this.$message.info(this.$t('indicatorIde.clearSignalsNoChart'))
        return
      }
      const chartInstance = chart.chartRef
      if (chart.addedSignalOverlayIds && chart.addedSignalOverlayIds.length) {
        chart.addedSignalOverlayIds.forEach(id => {
          try {
            if (typeof chartInstance.removeOverlay === 'function') chartInstance.removeOverlay(id)
          } catch (_) {}
        })
        chart.addedSignalOverlayIds = []
      }
      if (!silent) this.$message.success(this.$t('indicatorIde.clearSignalsDone'))
    },

    async saveIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: { id: this.selectedIndicatorId, code: this.currentCode, userid: this.userId }
        })
        if (res && res.code === 1) {
          this.codeDirty = false
          this.$message.success(this.$t('indicatorIde.saved'))
          const ind = this.indicators.find(i => i.id === this.selectedIndicatorId)
          if (ind) ind.code = this.currentCode
          this.syncSelectedIndicatorToChart(this.currentCode)
        } else {
          const m = (res && res.msg) || ''
          if (m === 'indicator_purchased_readonly') {
            this.$message.warning(this.$t('indicatorIde.saveBlockedPurchased'))
          } else {
            this.$message.error(m || this.$t('indicatorIde.saveFailed'))
          }
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        const m = (data && data.msg) || ''
        if (m === 'indicator_purchased_readonly') {
          this.$message.warning(this.$t('indicatorIde.saveBlockedPurchased'))
        } else {
          this.$message.error((e && e.message) || this.$t('indicatorIde.saveFailed'))
        }
      }
    },

    handleDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      if (this.selectedIndicatorIsPurchased) {
        this.$message.warning(this.$t('indicatorIde.deleteBlockedPurchased'))
        return
      }
      const ind = this.selectedIndicatorObj
      const name = (ind && ind.name) || ('#' + this.selectedIndicatorId)
      const h = this.$createElement
      const children = [
        h('p', { style: { margin: '0 0 8px' } }, [
          this.$t('dashboard.indicator.delete.confirmContent', { name })
        ])
      ]
      if (this.codeDirty) {
        children.push(
          h('p', { style: { margin: 0, color: '#fa8c16', fontSize: '13px' } }, [
            this.$t('indicatorIde.deleteUnsavedHint')
          ])
        )
      }
      Modal.confirm({
        title: this.$t('dashboard.indicator.delete.confirmTitle'),
        content: h('div', children),
        okText: this.$t('dashboard.indicator.delete.confirmOk'),
        cancelText: this.$t('dashboard.indicator.delete.confirmCancel'),
        okType: 'danger',
        onOk: () => this.confirmDeleteIndicator()
      })
    },

    async confirmDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      const id = this.selectedIndicatorId
      this.deletingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/deleteIndicator',
          method: 'post',
          data: { id }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.delete.success'))
          await this.loadIndicators()
          if (this.indicators.length > 0) {
            const first = this.indicators[0]
            this.selectedIndicatorId = first.id
            this.onIndicatorChange(first.id)
          } else {
            this.selectedIndicatorId = undefined
            this.onIndicatorChange(undefined)
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.delete.failed'))
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        this.$message.error((data && data.msg) || (e && e.message) || this.$t('dashboard.indicator.delete.failed'))
      } finally {
        this.deletingIndicator = false
      }
    },

    /** 从代码行解析 # @strategy key value → { key: rawString } */
    parseStrategyAnnotationRaw (code) {
      const lineRe = /^#\s*@strategy\s+(\w+)\s*:?\s*(\S+)/i
      const config = {}
      if (!code) return config
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        const m = line.match(lineRe)
        if (m) config[m[1]] = m[2]
      }
      return config
    },
    /** 与后端 StrategyConfigParser 一致：风控/仓位仅来自 @strategy（0–1 小数比例） */
    strategyConfigFromCode (code) {
      const raw = this.parseStrategyAnnotationRaw(code || '')
      const toFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? null : f }
      const toBool = (v) => ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase())

      const stopLossPct = toFloat(raw.stopLossPct) ?? 0
      const takeProfitPct = toFloat(raw.takeProfitPct) ?? 0
      let entryPct = toFloat(raw.entryPct)
      if (entryPct == null || entryPct === 0) {
        entryPct = 1.0
      } else if (entryPct > 1 && entryPct <= 100) {
        entryPct = entryPct / 100
      }
      entryPct = Math.max(0.01, Math.min(1, entryPct))

      const trailingEnabled = raw.trailingEnabled != null ? toBool(raw.trailingEnabled) : false
      const trailingPct = toFloat(raw.trailingStopPct) ?? 0
      const activationPct = toFloat(raw.trailingActivationPct) ?? 0

      return {
        risk: {
          stopLossPct,
          takeProfitPct,
          trailing: {
            enabled: trailingEnabled,
            pct: trailingPct,
            activationPct: activationPct
          }
        },
        position: { entryPct },
        execution: { signalTiming: 'next_bar_open' },
        scale: {
          trendAdd: { enabled: false },
          dcaAdd: { enabled: false },
          trendReduce: { enabled: false },
          adverseReduce: { enabled: false }
        }
      }
    },
    buildBacktestStrategyConfig () {
      return this.strategyConfigFromCode(this.currentCode || '')
    },
    buildExperimentParameterSpace () {
      const fractionSeries = (ratio, fallbackValues, multipliers = [0.5, 1, 1.5], max = 1) => {
        const raw = Number(ratio || 0)
        if (raw <= 0) return fallbackValues
        const values = multipliers.map(m => Math.max(0, Math.min(max, Number((raw * m).toFixed(4)))))
        return Array.from(new Set(values)).sort((a, b) => a - b)
      }
      const ann = this.parseStrategyAnnotationRaw(this.currentCode || '')
      const slR = parseFloat(ann.stopLossPct)
      const tpR = parseFloat(ann.takeProfitPct)
      const enR = parseFloat(ann.entryPct)
      const stopLossValues = fractionSeries(!isNaN(slR) ? slR : 0, [0, 0.01, 0.02], [0.5, 1, 1.5], 1)
      const takeProfitValues = fractionSeries(!isNaN(tpR) ? tpR : 0, [0.03, 0.05, 0.08], [0.75, 1, 1.25], 5)
      let entryBase = !isNaN(enR) && enR > 0 ? enR : 1
      if (entryBase > 1 && entryBase <= 100) entryBase = entryBase / 100
      const entryPctValues = fractionSeries(entryBase, [0.25, 0.5, 1], [0.5, 1, 1.25], 1)
      const leverageBase = Math.max(1, Number(this.leverage || 1))
      const leverageValues = Array.from(new Set([Math.max(1, leverageBase - 1), leverageBase, Math.min(5, leverageBase + 1)])).sort((a, b) => a - b)

      return {
        'strategyConfig.risk.stopLossPct': stopLossValues,
        'strategyConfig.risk.takeProfitPct': takeProfitValues,
        'strategyConfig.position.entryPct': entryPctValues,
        leverage: leverageValues
      }
    },
    buildExperimentBase () {
      if (!this.currentCode) return null
      const pct = v => Number(v || 0) / 100
      return {
        indicatorCode: this.currentCode,
        indicatorId: this.selectedIndicatorId,
        market: this.market,
        symbol: this.symbol,
        timeframe: this.timeframe,
        startDate: this.startDate.format('YYYY-MM-DD'),
        endDate: this.endDate.format('YYYY-MM-DD'),
        initialCapital: this.initialCapital,
        commission: pct(this.commission),
        slippage: pct(this.slippage),
        leverage: this.leverage,
        tradeDirection: this.tradeDirection,
        strategyConfig: this.buildBacktestStrategyConfig(),
        enableMtf: this.enableMtf,
        runType: 'indicator'
      }
    },
    buildExperimentPayload () {
      const base = this.buildExperimentBase()
      if (!base) return null
      return {
        base,
        maxRounds: 3,
        candidatesPerRound: 5,
        earlyStopScore: 82
      }
    },
    buildStructuredTunePayload () {
      const base = this.buildExperimentBase()
      if (!base) return null
      return {
        base,
        parameterSpace: this.buildExperimentParameterSpace(),
        evolution: {
          method: this.structuredTuneMethod,
          maxVariants: 48
        },
        includeBaseline: true
      }
    },
    _authTokenForFetch () {
      let token = storage.get(ACCESS_TOKEN)
      if (token && typeof token === 'object') {
        token = token.token || token.value || ''
      }
      return (typeof token === 'string' && token) ? token : ''
    },
    /** 解析单个 SSE 文本块（event: / data:） */
    _parseSseEventBlock (block) {
      if (!block || !String(block).trim()) return null
      let eventName = 'message'
      const dataLines = []
      for (const line of String(block).split(/\r?\n/)) {
        if (!line) continue
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^\s/, ''))
      }
      if (!dataLines.length) return null
      return { event: eventName, data: dataLines.join('\n') }
    },
    _applyExperimentProgress (p) {
      if (!p || typeof p !== 'object') return
      const kind = p.event
      if (kind === 'regime') {
        if (p.status === 'running') {
          this.experimentLiveHint = this.$t('indicatorIde.experimentHintRegime')
        }
        if (p.status === 'done') {
          this.experimentLiveHint = this.$t('indicatorIde.experimentHintRegimeDone')
        }
      } else if (kind === 'round_start') {
        const r = Number(p.round) || 0
        const mx = Number(p.maxRounds) || this.experimentMaxRounds
        this.experimentCurrentRound = r
        if (mx) this.experimentMaxRounds = mx
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintRound', { n: r, max: this.experimentMaxRounds })
      } else if (kind === 'candidate_backtest') {
        const r = Number(p.round) || this.experimentCurrentRound || 1
        const i = Number(p.index) || 0
        const t = Number(p.total) || 0
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintBacktest', { round: r, i, total: t })
      } else if (kind === 'round_done') {
        const bs = p.bestScore
        if (typeof bs === 'number' && !isNaN(bs)) {
          this.experimentRoundScores = [...this.experimentRoundScores, bs]
        }
        if (p.globalBestScore != null && !isNaN(Number(p.globalBestScore))) {
          this.experimentGlobalBestScoreLive = Number(p.globalBestScore)
        }
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintRoundDone', {
          n: p.round || this.experimentCurrentRound,
          score: (p.bestScore != null ? Number(p.bestScore) : 0).toFixed(1)
        })
      }
    },
    /**
     * 使用 SSE（/api/experiment/ai-optimize）流式更新轮次与回测进度；避免 sync 接口长时间无响应导致 UI 卡在 0/3。
     */
    async streamAiOptimizeWithSse (payload, signal) {
      const token = this._authTokenForFetch()
      const lang = storage.get('lang') || 'en-US'
      const response = await fetch('/api/experiment/ai-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Access-Token': token,
          'token': token,
          'X-App-Lang': lang,
          'Accept-Language': lang,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(payload),
        credentials: 'include',
        signal
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        throw new Error('No response stream')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalData = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split(/\r?\n\r?\n/)
        buffer = parts.pop() || ''
        for (const rawBlock of parts) {
          const evt = this._parseSseEventBlock(rawBlock)
          if (!evt) continue
          if (evt.event === 'done') {
            try {
              finalData = JSON.parse(evt.data)
            } catch (e) {
              throw new Error(this.$t('indicatorIde.aiExperimentFailed'))
            }
          } else if (evt.event === 'error') {
            let msg = this.$t('indicatorIde.aiExperimentFailed')
            try {
              const j = JSON.parse(evt.data)
              if (j && j.msg) msg = j.msg
            } catch (_) {}
            throw new Error(msg)
          } else if (evt.event === 'progress') {
            try {
              const p = JSON.parse(evt.data)
              this._applyExperimentProgress(p)
            } catch (_) {}
          }
        }
      }
      return finalData
    },
    async handleRunAIExperiment () {
      if (!this.currentCode || !this.symbol || !this.startDate || !this.endDate) {
        this.$message.warning(this.$t('indicatorIde.aiExperimentNeedBacktestParams'))
        return
      }
      this.syncTradeUiFromStrategyCode(this.currentCode || '', { silent: true })
      const payload = this.buildExperimentPayload()
      if (!payload) return

      if (this.experimentAbortController) {
        try { this.experimentAbortController.abort() } catch (_) {}
      }
      this.experimentAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null
      const signal = this.experimentAbortController ? this.experimentAbortController.signal : undefined

      this.experimentRunKind = 'llm'
      this.experimentRunning = true
      this.experimentError = ''
      this.experimentResult = null
      this.experimentCurrentRound = 0
      this.experimentMaxRounds = payload.maxRounds || 3
      this.experimentRoundScores = []
      this.experimentGlobalBestScoreLive = 0
      this.experimentLiveHint = this.$t('indicatorIde.experimentHintStarting')
      this.resultTab = 'aisystem'
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)

      try {
        const data = await this.streamAiOptimizeWithSse(payload, signal)
        if (data && typeof data === 'object') {
          this.experimentResult = data
          this.experimentSelectedCandidateName = (((data || {}).bestStrategyOutput || {}).name) || ((((data || {}).rankedStrategies) || [])[0] || {}).name || ''
          this.resultTab = 'aisystem'
          this.$message.success(this.$t('indicatorIde.aiExperimentDone'))
        } else {
          throw new Error(this.$t('indicatorIde.aiExperimentFailed'))
        }
      } catch (e) {
        if (e && (e.name === 'AbortError' || String(e.message || '').includes('aborted'))) {
          this.$message.info(this.$t('indicatorIde.experimentAborted'))
        } else {
          this.experimentError = (e && e.message) || this.$t('indicatorIde.aiExperimentFailed')
          this.$message.error(this.experimentError)
        }
      } finally {
        this.experimentRunning = false
        this.experimentLiveHint = ''
        this.experimentAbortController = null
        clearInterval(this.elapsedTimer)
      }
    },
    async handleRunStructuredTune () {
      if (!this.currentCode || !this.symbol || !this.startDate || !this.endDate) {
        this.$message.warning(this.$t('indicatorIde.aiExperimentNeedBacktestParams'))
        return
      }
      this.syncTradeUiFromStrategyCode(this.currentCode || '', { silent: true })
      const payload = this.buildStructuredTunePayload()
      if (!payload) return

      this.experimentRunKind = 'structured'
      this.experimentRunning = true
      this.experimentError = ''
      this.experimentResult = null
      this.experimentCurrentRound = 0
      this.experimentMaxRounds = 1
      this.experimentRoundScores = []
      this.experimentGlobalBestScoreLive = 0
      this.resultTab = 'aisystem'
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)

      try {
        const response = await request({
          url: '/api/experiment/structured-tune',
          method: 'post',
          data: payload,
          timeout: 600000
        })
        if (response && response.code === 1 && response.data) {
          this.experimentResult = response.data
          this.experimentSelectedCandidateName = (((response.data || {}).bestStrategyOutput || {}).name) || ((((response.data || {}).rankedStrategies) || [])[0] || {}).name || ''
          this.resultTab = 'aisystem'
          this.$message.success(this.$t('indicatorIde.structuredTuneDone'))
        } else {
          throw new Error((response && response.msg) || this.$t('indicatorIde.structuredTuneFailed'))
        }
      } catch (e) {
        this.experimentError = e.message || this.$t('indicatorIde.structuredTuneFailed')
        this.$message.error(this.experimentError)
      } finally {
        this.experimentRunning = false
        clearInterval(this.elapsedTimer)
      }
    },
    replaceEditorCode (nextCode) {
      const val = nextCode == null ? '' : String(nextCode)
      this.currentCode = val
      if (this.cmInstance) {
        this.cmInstance.setValue(val)
        this.cmInstance.refresh()
      }
      this.codeDirty = true
    },
    /** 与后端 StrategyConfigParser.VALID_KEYS 对齐（不含 leverage，杠杆仅回测面板） */
    _strategyAnnotationKeysSet () {
      return new Set([
        'stopLossPct', 'takeProfitPct', 'entryPct',
        'trailingEnabled', 'trailingStopPct', 'trailingActivationPct', 'tradeDirection'
      ])
    },
    formatStrategyAnnotationValue (key, value) {
      if (value === null || value === undefined) return null
      if (key === 'trailingEnabled') return value ? 'true' : 'false'
      if (key === 'tradeDirection') {
        const t = String(value).toLowerCase()
        return ['long', 'short', 'both'].includes(t) ? t : 'long'
      }
      const n = Number(value)
      if (!Number.isFinite(n)) return String(value)
      let s = n.toFixed(8).replace(/\.?0+$/, '')
      if (s === '' || s === '-') s = '0'
      return s
    },
    flattenExperimentOverrides (overrides) {
      const out = {}
      if (!overrides || typeof overrides !== 'object') return out
      const pathToAnn = {
        'strategyConfig.risk.stopLossPct': 'stopLossPct',
        'strategyConfig.risk.takeProfitPct': 'takeProfitPct',
        'strategyConfig.position.entryPct': 'entryPct',
        'strategyConfig.risk.trailing.pct': 'trailingStopPct',
        'strategyConfig.risk.trailing.activationPct': 'trailingActivationPct',
        'strategyConfig.risk.trailing.enabled': 'trailingEnabled'
      }
      const norm = k => String(k || '').replace(/strategy_config\./gi, 'strategyConfig.')
      Object.keys(overrides).forEach(k => {
        if (k === 'indicatorParams' || k === 'riskParams') return
        if (k === 'leverage') {
          out.leverage = Number(overrides[k])
          return
        }
        const ann = pathToAnn[norm(k)]
        if (ann) {
          const v = overrides[k]
          out[ann] = ann === 'trailingEnabled' ? !!v : v
        }
      })
      const rp = overrides.riskParams
      if (rp && typeof rp === 'object') {
        if (rp.stopLossPct != null) out.stopLossPct = Number(rp.stopLossPct)
        if (rp.takeProfitPct != null) out.takeProfitPct = Number(rp.takeProfitPct)
        if (rp.entryPct != null) out.entryPct = Number(rp.entryPct)
        if (rp.leverage != null) out.leverage = Number(rp.leverage)
        const tr = rp.trailingStop || rp.trailing
        if (tr && typeof tr === 'object') {
          if (tr.enabled != null) out.trailingEnabled = !!tr.enabled
          if (tr.pct != null) out.trailingStopPct = Number(tr.pct)
          if (tr.activationPct != null) out.trailingActivationPct = Number(tr.activationPct)
        }
      }
      return out
    },
    applyStrategyAnnotationsToCode (code, flatMap) {
      const allowed = this._strategyAnnotationKeysSet()
      const keysWithValues = {}
      Object.keys(flatMap || {}).forEach(k => {
        if (!allowed.has(k)) return
        const v = flatMap[k]
        if (v === undefined || v === null) return
        keysWithValues[k] = v
      })
      if (!Object.keys(keysWithValues).length) return code || ''

      const lineRe = /^(\s*#\s*@strategy\s+)(\w+)(\s*:?\s*)(\S+)(\s*(.*))$/i
      const lines = (code || '').split('\n')
      const used = new Set()

      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(lineRe)
        if (!m) continue
        const lineKey = m[2]
        const canonical = Object.keys(keysWithValues).find(
          kk => kk.toLowerCase() === lineKey.toLowerCase()
        )
        if (!canonical) continue
        const formatted = this.formatStrategyAnnotationValue(canonical, keysWithValues[canonical])
        if (formatted === null) continue
        lines[i] = `${m[1]}${canonical}${m[3]}${formatted}${m[5]}`
        used.add(canonical)
      }

      const toInsert = Object.keys(keysWithValues).filter(k => !used.has(k))
      if (toInsert.length) {
        let insertAt = 0
        for (let j = lines.length - 1; j >= 0; j--) {
          if (/^\s*#\s*@strategy\s+/i.test(lines[j])) {
            insertAt = j + 1
            break
          }
        }
        if (insertAt === 0) {
          for (let j = 0; j < lines.length; j++) {
            const t = (lines[j] || '').trim()
            if (t && !t.startsWith('#')) {
              insertAt = j
              break
            }
          }
        }
        const block = toInsert.map(k => {
          const v = this.formatStrategyAnnotationValue(k, keysWithValues[k])
          return `# @strategy ${k} ${v}`
        })
        lines.splice(insertAt, 0, ...block)
      }
      return lines.join('\n')
    },
    applyIndicatorParamsToCode (code, params) {
      if (!code || !params || typeof params !== 'object') return code
      const lineRe = /^(\s*#\s*@param\s+)(\w+)(\s+)(int|float|bool|str|string)(\s+)(\S+)(\s*(.*))$/i
      const lines = code.split('\n')
      let changed = false
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(lineRe)
        if (!m) continue
        const name = m[2]
        if (!Object.prototype.hasOwnProperty.call(params, name)) continue
        const val = params[name]
        const formatted = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val)
        lines[i] = `${m[1]}${name}${m[3]}${m[4]}${m[5]}${formatted}${m[7] || ''}`
        changed = true
      }
      return changed ? lines.join('\n') : code
    },
    applyExperimentOverridesToCode (code, overrides) {
      const strat = this.flattenExperimentOverrides(overrides)
      let next = this.applyStrategyAnnotationsToCode(code, strat)
      const ip = overrides.indicatorParams
      if (ip && typeof ip === 'object' && Object.keys(ip).length) {
        next = this.applyIndicatorParamsToCode(next, ip)
      }
      return next
    },
    applyBestExperimentCandidate () {
      const best = this.experimentBest
      if (!best || !best.overrides || !Object.keys(best.overrides).length) {
        this.$message.warning(this.$t('indicatorIde.applyCandidateNoOverrides'))
        return
      }
      this.applyExperimentCandidate(best)
    },
    applyExperimentCandidate (candidate) {
      if (!candidate || !candidate.overrides || !Object.keys(candidate.overrides).length) {
        this.$message.warning(this.$t('indicatorIde.applyCandidateNoOverrides'))
        return
      }
      const prev = this.currentCode || ''
      const flatOverrides = this.flattenExperimentOverrides(candidate.overrides)
      const next = this.applyExperimentOverridesToCode(prev, candidate.overrides)
      if (next === prev) {
        this.$message.info(this.$t('indicatorIde.applyCandidateNoChanges'))
        return
      }
      this.replaceEditorCode(next)
      this.experimentSelectedCandidateName = candidate.name || this.experimentSelectedCandidateName
      if (flatOverrides.leverage != null) {
        const lv = Math.max(1, Math.min(125, Math.round(Number(flatOverrides.leverage))))
        if (Number.isFinite(lv)) this.leverage = lv
      }
      this.syncTradeUiFromStrategyCode(next, { silent: true })
      this.syncSelectedIndicatorToChart(next)
      this.$message.success(this.$t('indicatorIde.bestParamsApplied'))
    },
    selectExperimentCandidate (candidate) {
      if (!candidate) return
      this.experimentSelectedCandidateName = candidate.name || ''
    },
    async runBacktestWithExperimentCandidate (candidate) {
      if (!candidate) return
      this.applyExperimentCandidate(candidate)
      await this.$nextTick()
      this.runBacktest()
    },
    handleCreateStrategyFromExperiment () {
      const candidate = this.experimentSelectedCandidate || this.experimentBest
      this.navigateToTradingAssistantWithDraft(candidate, { source: 'experiment_candidate' })
    },
    buildStrategyCreationDraft (candidate = null, options = {}) {
      const indicator = this.selectedIndicatorObj || {}
      const strategyConfig = candidate && candidate.snapshot && candidate.snapshot.strategy_config
        ? JSON.parse(JSON.stringify(candidate.snapshot.strategy_config))
        : this.buildBacktestStrategyConfig()
      const leverage = candidate && candidate.snapshot && candidate.snapshot.leverage != null
        ? Number(candidate.snapshot.leverage || 1)
        : Number(this.leverage || 1)
      const code = this.currentCode || indicator.code || ''
      return {
        version: 'indicator-ide-strategy-draft-v1',
        createdAt: new Date().toISOString(),
        source: options.source || 'indicator_ide',
        indicator: {
          id: indicator.id || null,
          name: indicator.name || '',
          description: indicator.description || '',
          code
        },
        market: this.market,
        symbol: this.symbol,
        timeframe: this.timeframe,
        initialCapital: Number(this.initialCapital || 0),
        commission: Number(this.commission || 0) / 100,
        slippage: Number(this.slippage || 0) / 100,
        leverage,
        tradeDirection: this.tradeDirection,
        enableMtf: !!this.enableMtf,
        strategyConfig,
        experiment: candidate
          ? {
              candidateName: candidate.name || '',
              candidateSource: candidate.source || '',
              overrides: JSON.parse(JSON.stringify(candidate.overrides || {})),
              score: JSON.parse(JSON.stringify(candidate.score || {})),
              resultSummary: JSON.parse(JSON.stringify(candidate.result || {})),
              regime: JSON.parse(JSON.stringify(this.experimentRegime || {}))
            }
          : null
      }
    },
    persistStrategyCreationDraft (draft) {
      const key = `qd_strategy_creation_draft_${Date.now()}`
      try {
        window.sessionStorage.setItem(key, JSON.stringify(draft))
      } catch (e) {
        console.warn('Persist strategy creation draft failed:', e)
      }
      return key
    },
    navigateToTradingAssistantWithDraft (candidate = null, options = {}) {
      const indicator = this.selectedIndicatorObj
      if (!indicator) return
      this.syncTradeUiFromStrategyCode(this.currentCode || indicator.code || '', { silent: true })
      const draft = this.buildStrategyCreationDraft(candidate, options)
      const draftKey = this.persistStrategyCreationDraft(draft)
      const snapshot = candidate && candidate.snapshot ? candidate.snapshot : null
      this.$router.push({
        path: '/strategy-live',
        query: {
          mode: 'create',
          source: options.source || 'indicator_ide',
          indicator_id: String(indicator.id),
          indicator_name: indicator.name || '',
          indicator_desc: indicator.description || '',
          market: draft.market || '',
          symbol: draft.symbol || '',
          timeframe: draft.timeframe || '',
          leverage: String(draft.leverage || 1),
          trade_direction: draft.tradeDirection || 'long',
          draft_key: draftKey,
          draft_version: draft.version,
          candidate_name: candidate ? (candidate.name || '') : '',
          candidate_score: candidate && candidate.score ? String(candidate.score.overallScore || '') : '',
          strategy_config: snapshot ? encodeURIComponent(JSON.stringify(snapshot.strategy_config || {})) : '',
          indicator_code: draft.indicator && draft.indicator.code ? encodeURIComponent(draft.indicator.code) : ''
        }
      })
    },
    _normalizeOverrideKey (key) {
      return String(key || '').replace(/strategy_config\./g, 'strategyConfig.')
    },
    humanizeExperimentKey (key) {
      const n = this._normalizeOverrideKey(key)
      const map = {
        riskParams: this.$t('indicatorIde.riskParamsGroup'),
        indicatorParams: this.$t('indicatorIde.indicatorParamsGroup'),
        stopLossPct: this.$t('indicatorIde.stopLoss'),
        takeProfitPct: this.$t('indicatorIde.takeProfit'),
        entryPct: this.$t('indicatorIde.entryPct'),
        trailingStopPct: this.$t('indicatorIde.trailingPct'),
        trailingActivationPct: this.$t('indicatorIde.activation'),
        trailingEnabled: this.$t('indicatorIde.trailing'),
        tradeDirection: this.$t('indicatorIde.direction'),
        'strategyConfig.risk.stopLossPct': this.$t('indicatorIde.stopLoss'),
        'strategyConfig.risk.takeProfitPct': this.$t('indicatorIde.takeProfit'),
        'strategyConfig.position.entryPct': this.$t('indicatorIde.entryPct'),
        'strategyConfig.risk.trailing.pct': this.$t('indicatorIde.trailingPct'),
        'strategyConfig.risk.trailing.activationPct': this.$t('indicatorIde.activation'),
        'strategyConfig.risk.trailing.enabled': this.$t('indicatorIde.trailing'),
        leverage: this.$t('indicatorIde.leverage'),
        commission: this.$t('indicatorIde.commission'),
        slippage: this.$t('indicatorIde.slippage')
      }
      return map[n] || n
    },
    humanizeExperimentScoreKey (key) {
      const map = {
        returnScore: this.$t('indicatorIde.scoreReturn'),
        annualReturnScore: this.$t('indicatorIde.scoreAnnualReturn'),
        sharpeScore: this.$t('indicatorIde.scoreSharpe'),
        profitFactorScore: this.$t('indicatorIde.scoreProfitFactor'),
        winRateScore: this.$t('indicatorIde.scoreWinRate'),
        drawdownScore: this.$t('indicatorIde.scoreDrawdown'),
        stabilityScore: this.$t('indicatorIde.scoreStability'),
        sampleSizeScore: this.$t('indicatorIde.scoreSampleSize'),
        regimeFitScore: this.$t('indicatorIde.scoreRegimeFit')
      }
      return map[key] || key
    },
    translateExperimentRegime (key) {
      const map = {
        bull_trend: this.$t('indicatorIde.regimeBullTrend'),
        bear_trend: this.$t('indicatorIde.regimeBearTrend'),
        range_compression: this.$t('indicatorIde.regimeRangeCompression'),
        high_volatility: this.$t('indicatorIde.regimeHighVolatility'),
        transition: this.$t('indicatorIde.regimeTransition'),
        'Bull Trend': this.$t('indicatorIde.regimeBullTrend'),
        'Bear Trend': this.$t('indicatorIde.regimeBearTrend'),
        'Range Compression': this.$t('indicatorIde.regimeRangeCompression'),
        'High Volatility': this.$t('indicatorIde.regimeHighVolatility'),
        Transition: this.$t('indicatorIde.regimeTransition')
      }
      return map[key] || key || '--'
    },
    translateExperimentFamily (key) {
      const map = {
        trend_following: this.$t('indicatorIde.familyTrendFollowing'),
        breakout: this.$t('indicatorIde.familyBreakout'),
        pullback_continuation: this.$t('indicatorIde.familyPullbackContinuation'),
        breakdown: this.$t('indicatorIde.familyBreakdown'),
        short_pullback: this.$t('indicatorIde.familyShortPullback'),
        mean_reversion: this.$t('indicatorIde.familyMeanReversion'),
        bollinger_reversion: this.$t('indicatorIde.familyBollingerReversion'),
        range_breakout_watch: this.$t('indicatorIde.familyRangeBreakoutWatch'),
        volatility_breakout: this.$t('indicatorIde.familyVolatilityBreakout'),
        reduced_risk_trend: this.$t('indicatorIde.familyReducedRiskTrend'),
        event_drive: this.$t('indicatorIde.familyEventDrive'),
        hybrid: this.$t('indicatorIde.familyHybrid'),
        wait_and_see: this.$t('indicatorIde.familyWaitAndSee'),
        confirmation_breakout: this.$t('indicatorIde.familyConfirmationBreakout')
      }
      return map[key] || key
    },
    formatExperimentSegmentLabel (segment) {
      if (!segment) return '--'
      return this.translateExperimentRegime(segment.regime || segment.label || '')
    },
    formatExperimentOverrideValue (key, value) {
      if (key === 'riskParams' || key === 'indicatorParams') {
        try {
          return JSON.stringify(value)
        } catch (_) {
          return String(value)
        }
      }
      if (key === 'trailingEnabled') return value ? 'true' : 'false'
      if (String(key).includes('Pct')) return `${(Number(value || 0) * 100).toFixed(2)}%`
      if (key === 'leverage') return `${Number(value || 0)}x`
      return String(value)
    },
    formatExperimentSource (source) {
      if (!source) return '--'
      const map = {
        baseline: this.$t('indicatorIde.experimentSourceBaseline'),
        manual_variant: this.$t('indicatorIde.experimentSourceManual'),
        evolution_grid: this.$t('indicatorIde.experimentSourceGrid'),
        evolution_random: this.$t('indicatorIde.experimentSourceRandom')
      }
      if (map[source]) return map[source]
      const aiMatch = String(source).match(/^ai_round_(\d+)$/)
      if (aiMatch) return `AI ${this.$t('indicatorIde.round')} ${aiMatch[1]}`
      return source
    },

    // ===== Backtest =====
    async runBacktest () {
      if (!this.canRunBacktest) return
      this.running = true
      this.hasResult = false
      this.resultTab = 'backtest'
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)
      try {
        const response = await request({
          url: '/api/indicator/backtest',
          method: 'post',
          data: {
            userid: this.userId || 1,
            indicatorId: this.selectedIndicatorId,
            indicatorCode: this.currentCode || '',
            symbol: this.symbol,
            market: this.market,
            timeframe: this.timeframe,
            startDate: this.startDate.format('YYYY-MM-DD'),
            endDate: this.endDate.format('YYYY-MM-DD'),
            initialCapital: this.initialCapital,
            commission: Number(this.commission || 0) / 100,
            slippage: Number(this.slippage || 0) / 100,
            leverage: this.leverage,
            tradeDirection: this.tradeDirection,
            strategyConfig: this.buildBacktestStrategyConfig(),
            enableMtf: this.enableMtf,
            persist: true
          },
          timeout: 600000
        })
        if (response.code === 1 && response.data) {
          if (response.data.runId) this.backtestRunId = response.data.runId
          this.result = response.data.result || response.data
          this.hasResult = true
          this.resultTab = 'backtest'
          this.$nextTick(() => {
            setTimeout(() => {
              this.renderEquityChart()
              this.renderBacktestSignals()
            }, 150)
          })
          this.$message.success(this.$t('indicatorIde.backtestComplete'))
        } else {
          this.$message.error(response.msg || this.$t('indicatorIde.backtestFailed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('indicatorIde.backtestFailed'))
      } finally {
        this.running = false
        clearInterval(this.elapsedTimer)
      }
    },

    // ===== Render backtest buy/sell signals on K-line chart =====
    renderBacktestSignals () {
      const trades = (this.result && this.result.trades) || []
      if (!trades.length) return
      const chart = this.$refs.klineChart
      if (!chart || !chart.chartRef) return
      const chartInstance = chart.chartRef

      this.clearBacktestSignalOverlays({ silent: true })

      // Build sorted kline timestamp array for snap-to-nearest matching
      const klineData = (typeof chartInstance.getDataList === 'function') ? chartInstance.getDataList() : []
      const klineTimestamps = klineData.map(k => k.timestamp)

      for (const trade of trades) {
        const ty = (trade.type || '').toLowerCase()
        const isBuy = ty.startsWith('open_long') || ty === 'buy' || ty === 'close_short'
        const isSell = ty.startsWith('open_short') || ty === 'sell' || ty === 'close_long'
        if (!isBuy && !isSell) continue

        let timestamp = trade.timestamp || 0
        if (!timestamp && trade.time) {
          // Force UTC parsing: backend time strings like '2024-01-15 09:30' are UTC
          let timeStr = String(trade.time)
          if (!timeStr.includes('T')) timeStr = timeStr.replace(' ', 'T')
          if (!timeStr.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(timeStr)) timeStr += 'Z'
          const d = new Date(timeStr)
          if (!isNaN(d.getTime())) timestamp = d.getTime()
        }
        if (timestamp < 1e10) timestamp *= 1000

        // Snap to nearest K-line bar to avoid sub-bar offset from execution timeframe
        if (klineTimestamps.length > 0) {
          let lo = 0; let hi = klineTimestamps.length - 1
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (klineTimestamps[mid] < timestamp) lo = mid + 1
            else hi = mid
          }
          // lo is the first kline >= timestamp; compare with lo-1 to find nearest
          if (lo > 0 && (timestamp - klineTimestamps[lo - 1]) < (klineTimestamps[lo] - timestamp)) {
            lo = lo - 1
          }
          timestamp = klineTimestamps[lo]
        }

        const price = trade.price || 0
        if (!timestamp || !price) continue

        try {
          if (typeof chartInstance.createOverlay === 'function') {
            const overlayId = chartInstance.createOverlay({
              name: 'signalTag',
              points: [
                { timestamp, value: price },
                { timestamp, value: price }
              ],
              extendData: {
                text: isBuy ? 'B' : 'S',
                color: isBuy ? '#00E676' : '#FF5252',
                side: isBuy ? 'buy' : 'sell',
                action: isBuy ? 'buy' : 'sell',
                price
              },
              lock: true
            }, 'candle_pane')
            if (overlayId && chart.addedSignalOverlayIds) {
              chart.addedSignalOverlayIds.push(overlayId)
            }
          }
        } catch (_) {}
      }
    },

    // ===== AI Code Generation =====
    handleAIGenerateEnterKey (e) {
      if (e.ctrlKey || e.metaKey) this.handleAIGenerate()
    },
    async handleAIGenerate () {
      if (this.selectedIndicatorIsPurchased) {
        this.$message.warning(this.$t('indicatorIde.aiGenBlockedPurchased'))
        return
      }
      if (!this.aiPrompt || !this.aiPrompt.trim()) {
        this.$message.warning(this.$t('indicatorIde.aiPromptRequired'))
        return
      }
      this.aiGenerating = true
      this.aiDebugSummary = null
      let existingCode = ''
      if (this.cmInstance) existingCode = this.cmInstance.getValue() || ''
      if (this.cmInstance) {
        this.cmInstance.setValue('# AI generating...\n')
        this.cmInstance.refresh()
      }
      let generatedCode = ''
      try {
        const url = '/api/indicator/aiGenerate'
        const token = storage.get(ACCESS_TOKEN)
        const lang = (this.$i18n && this.$i18n.locale) || 'en-US'
        const requestBody = { prompt: this.aiPrompt.trim() }
        if (existingCode.trim()) requestBody.existingCode = existingCode.trim()

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Access-Token': token || '',
            'Token': token || '',
            'X-App-Lang': lang,
            'Accept-Language': lang
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP error! status: ${response.status}`)
        }
        if (!response.body || typeof response.body.getReader !== 'function') {
          throw new Error('AI service did not return a readable stream')
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue
            const data = line.substring(6)
            if (data === '[DONE]') break
            try {
              const json = JSON.parse(data)
              if (json.error) throw new Error(json.error)
              if (json.debug && json.debug.human_summary) {
                this.aiDebugSummary = this.normalizeAiDebugSummary(json.debug.human_summary)
              }
              if (json.content) {
                generatedCode += json.content
                const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
                if (this.cmInstance) {
                  this.cmInstance.setValue(cleanedCode)
                  this.cmInstance.setCursor({ line: this.cmInstance.lineCount() - 1, ch: 0 })
                  this.cmInstance.refresh()
                }
              }
            } catch (_) {}
          }
        }
        if (this.cmInstance && generatedCode) {
          const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
          this.cmInstance.setValue(cleanedCode)
          this.cmInstance.refresh()
          this.currentCode = cleanedCode
          this.codeDirty = true
          this.syncSelectedIndicatorToChart(cleanedCode)
          this.syncTradeUiFromStrategyCode(cleanedCode, { silent: true })
          this.$message.success(this.$t('indicatorIde.aiGenerateSuccess'))
          await this.fetchCodeQualityHints(cleanedCode)
          if (this.codeQualityHints.some(h => h.severity === 'error')) {
            this.aiPanelExpanded = true
            this.$message.warning(this.$t('indicatorIde.codeQualityHasErrors'))
          } else if (this.codeQualityHints.length) {
            this.aiPanelExpanded = true
            this.$message.info(this.$t('indicatorIde.codeQualityHasSuggestions'))
          }
        } else if (!generatedCode) {
          this.$message.warning(this.$t('indicatorIde.aiNoCode'))
        }
      } catch (error) {
        this.$message.error(error.message || this.$t('indicatorIde.aiGenerateFailed'))
        if (generatedCode && this.cmInstance) {
          this.cmInstance.setValue(this.cleanMarkdownCodeBlocks(generatedCode))
        }
      } finally {
        this.aiGenerating = false
      }
    },
    normalizeAiDebugSummary (summary) {
      if (!summary || typeof summary !== 'object') return null
      const fixedMessages = Array.isArray(summary.fixed_messages) ? summary.fixed_messages.filter(Boolean) : []
      const remainingMessages = Array.isArray(summary.remaining_messages) ? summary.remaining_messages.filter(Boolean) : []
      const normalized = {
        title: summary.title ? String(summary.title) : '',
        returned_text: summary.returned_text ? String(summary.returned_text) : '',
        fixed_messages: fixedMessages,
        remaining_messages: remainingMessages
      }
      if (!normalized.title && !normalized.returned_text && !fixedMessages.length && !remainingMessages.length) {
        return null
      }
      return normalized
    },
    aiDebugAlertType (summary = this.aiDebugSummary) {
      if (!summary) return 'info'
      if ((summary.remaining_messages || []).length) return 'warning'
      if ((summary.fixed_messages || []).length) return 'success'
      return 'info'
    },
    aiDebugState (summary = this.aiDebugSummary) {
      return this.aiDebugAlertType(summary)
    },
    aiDebugStateIcon (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'exclamation-circle'
      if (state === 'success') return 'check-circle'
      return 'info-circle'
    },
    aiDebugStateLabel (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return '仍有提醒'
      if (state === 'success') return '自动修复完成'
      return '质检已通过'
    },
    aiDebugStateTagColor (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'orange'
      if (state === 'success') return 'green'
      return 'blue'
    },
    qualityHintClass (h) {
      const s = (h && h.severity) || 'info'
      return {
        'quality-hint--error': s === 'error',
        'quality-hint--warn': s === 'warn',
        'quality-hint--info': s === 'info'
      }
    },
    formatQualityHint (h) {
      if (!h || !h.code) return ''
      const key = `indicatorIde.quality.${h.code}`
      const msg = this.$t(key, h.params || {})
      return msg === key ? String(h.code) : msg
    },
    async fetchCodeQualityHints (code) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        this.codeQualityHints = []
        return
      }
      this.codeQualityLoading = true
      try {
        const res = await request({
          url: '/api/indicator/codeQualityHints',
          method: 'post',
          data: { code: c }
        })
        if (res && res.code === 1 && res.data && Array.isArray(res.data.hints)) {
          this.codeQualityHints = res.data.hints
        } else {
          this.codeQualityHints = []
        }
      } catch (e) {
        this.codeQualityHints = []
      } finally {
        this.codeQualityLoading = false
      }
    },
    async runCodeQualityCheck () {
      const code = this.cmInstance ? (this.cmInstance.getValue() || '') : (this.currentCode || '')
      await this.fetchCodeQualityHints(code)
      if (!this.codeQualityHints.length) {
        this.$message.success(this.$t('indicatorIde.codeQualityAllGood'))
      }
    },
    cleanMarkdownCodeBlocks (code) {
      if (!code || typeof code !== 'string') return code
      let c = code.trim()
      if (!/```/.test(c)) return c
      c = c.replace(/^```[\w]*\s*\n?/i, '')
      if (c.startsWith('```')) c = c.replace(/^```\s*\n?/g, '')
      if (c.endsWith('```')) c = c.replace(/\n?```\s*$/g, '')
      c = c.replace(/^\s*```[\w]*\s*$/gm, '')
      c = c.replace(/^\s*```\s*$/gm, '')
      c = c.replace(/\n{3,}/g, '\n\n')
      return c.trim()
    },

    // ===== @strategy：strategyConfig 来自代码注解；此处仅同步交易方向（杠杆由回测面板独立设置，不写进代码） =====
    syncTradeUiFromStrategyCode (code, opts = {}) {
      const silent = !!(opts && opts.silent)
      const raw = this.parseStrategyAnnotationRaw(code || '')
      if (!Object.keys(raw).length) return
      let applied = 0
      const td = String(raw.tradeDirection || '').toLowerCase()
      if (td && ['long', 'short', 'both'].includes(td)) {
        this.tradeDirection = td
        applied++
      }
      if (applied > 0 && !silent) {
        this.$message.info(this.$t('indicatorIde.strategyAnnotationsApplied', { count: applied }))
      }
    },

    // ===== AI Optimize =====
    async handleAIOptimize () {
      if (!this.hasResult || !this.currentCode) return
      this.aiOptimizing = true
      this.codeDrawerVisible = true
      this.codePanelExpanded = true
      this.aiPanelExpanded = true

      const r = this.result || {}
      const metricsText = [
        `Total Return: ${this.fmtPct(r.totalReturn)}`,
        `Max Drawdown: ${this.fmtPct(r.maxDrawdown)}`,
        `Sharpe: ${(r.sharpeRatio || 0).toFixed(2)}`,
        `Win Rate: ${this.fmtPct(r.winRate)}`,
        `Profit Factor: ${(r.profitFactor || 0).toFixed(2)}`,
        `Total Trades: ${r.totalTrades || 0}`
      ].join(', ')

      this.aiPrompt = `Based on these backtest results (${metricsText}), optimize the parameters in my indicator code to improve risk-adjusted returns. Keep the same strategy logic but suggest better parameter values.`
      this.$nextTick(() => { this.aiOptimizing = false })
    },

    // ===== Quick Trade =====
    toggleQuickTradeDrawer () {
      if (!this.quickTradeDrawerVisible && this.market !== 'Crypto') {
        this.$message.warning(this.$t('quickTrade.cryptoOnly'))
        return
      }
      this.quickTradeDrawerVisible = !this.quickTradeDrawerVisible
    },
    closeQuickTradeDrawer () {
      this.quickTradeDrawerVisible = false
    },
    openQuickTrade () {
      if (this.market !== 'Crypto') {
        this.$message.warning(this.$t('quickTrade.cryptoOnly'))
        return
      }
      this.qtSymbol = this.symbol || ''
      const trades = (this.result && this.result.trades) || []
      const latestTrade = trades.length ? trades[trades.length - 1] : null
      this.qtPrice = latestTrade && latestTrade.price ? Number(latestTrade.price) : 0
      this.qtSide = ''
      this.quickTradeDrawerVisible = true
    },
    onQuickTradeSuccess () {
      this.$message.success(this.$t('quickTrade.orderSuccess'))
    },
    handleQuickTradeSymbolChange (newSymbol) {
      if (newSymbol && this.market === 'Crypto') {
        this.qtSymbol = newSymbol
      }
    },
    goToIndicatorMarket () {
      this.$router.push('/indicator-community')
    },
    startResizePanel (e) {
      e.preventDefault()
      this.resizeDragStartY = e.clientY
      this.resizeDragStartH = this.chartPanelHeight
      const onMove = (ev) => {
        const delta = ev.clientY - this.resizeDragStartY
        const next = this.resizeDragStartH + delta
        this.chartPanelHeight = Math.max(160, Math.min(next, window.innerHeight - 220))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    buildNewIndicatorStarterCode () {
      const label = moment().format('YYYY-MM-DD HH:mm')
      return (
        `my_indicator_name = "New Indicator ${label}"\n` +
        'my_indicator_description = "可选：用 # @strategy 配置风控与仓位；杠杆在回测面板设置。为 df 设置 buy/sell 布尔列并定义 output。"\n\n' +
        'df = df.copy()\n' +
        "df['buy'] = False\n" +
        "df['sell'] = False\n\n" +
        'output = {\n' +
        "  'name': my_indicator_name,\n" +
        "  'plots': [],\n" +
        "  'signals': []\n" +
        '}\n'
      )
    },
    async handleCreateIndicator () {
      if (!this.userId) {
        this.$message.error(this.$t('dashboard.indicator.error.pleaseLogin'))
        return
      }
      const proceed = () => this._createIndicatorInIde()
      if (this.codeDirty) {
        Modal.confirm({
          title: this.$t('indicatorIde.newIndicatorUnsavedTitle'),
          content: this.$t('indicatorIde.newIndicatorUnsavedContent'),
          okText: this.$t('indicatorIde.newIndicatorConfirmOk'),
          cancelText: this.$t('indicatorIde.newIndicatorConfirmCancel'),
          onOk: proceed
        })
      } else {
        await proceed()
      }
    },
    async _createIndicatorInIde () {
      const code = this.buildNewIndicatorStarterCode()
      this.creatingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: 0,
            code
          }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            this.selectedIndicatorId = targetId
            this.currentCode = code
            this.codeDirty = false
            if (this.cmInstance) {
              this.cmInstance.setValue(code)
              this.cmInstance.refresh()
            }
            this.syncSelectedIndicatorToChart(code)
            this.syncTradeUiFromStrategyCode(code, { silent: true })
            const ind = this.indicators.find(i => i.id === targetId)
            if (ind) ind.code = code
            this.$message.success(this.$t('indicatorIde.newIndicatorCreated'))
          } else {
            this.$message.error(this.$t('indicatorIde.newIndicatorFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.newIndicatorFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.newIndicatorFailed') + ': ' + (e.message || ''))
      } finally {
        this.creatingIndicator = false
      }
    },
    async handlePublishIndicator () {
      if (!this.selectedIndicatorObj) return
      if (this.selectedIndicatorIsPurchased) {
        this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
        return
      }
      if (this.codeDirty) {
        await this.saveIndicator()
      }
      const indicator = this.selectedIndicatorObj || {}
      this.publishIndicator = { ...indicator, code: this.currentCode || indicator.code || '' }
      this.publishPricingType = indicator.pricing_type || 'free'
      this.publishPrice = indicator.price || 10
      this.publishDescription = indicator.description || ''
      this.publishVipFree = !!indicator.vip_free
      this.showPublishModal = true
    },
    handleCreateStrategyFromIndicator () {
      this.navigateToTradingAssistantWithDraft(null, { source: 'indicator_ide' })
    },
    async handleConfirmPublish () {
      if (!this.userId || !this.publishIndicator) return
      this.publishing = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code: this.currentCode || this.publishIndicator.code,
            name: this.publishIndicator.name,
            description: this.publishDescription,
            publishToCommunity: true,
            pricingType: this.publishPricingType,
            price: this.publishPricingType === 'paid' ? this.publishPrice : 0,
            vipFree: this.publishPricingType === 'paid' ? this.publishVipFree : false
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.success'))
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.failed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.failed') + ': ' + (error.message || ''))
      } finally {
        this.publishing = false
      }
    },
    async handleUnpublish () {
      if (!this.userId || !this.publishIndicator) return
      this.unpublishing = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code: this.currentCode || this.publishIndicator.code,
            name: this.publishIndicator.name,
            description: this.publishIndicator.description,
            publishToCommunity: false,
            pricingType: 'free',
            price: 0,
            vipFree: false
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.unpublishSuccess'))
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.unpublishFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.unpublishFailed'))
      } finally {
        this.unpublishing = false
      }
    },

    // ===== Equity chart =====
    renderEquityChart () {
      const r = this.result
      if (!r || !r.equityCurve || !r.equityCurve.length) return
      const dom = this.$refs.eqChart
      if (!dom) return
      if (this.eqChartInstance) this.eqChartInstance.dispose()
      this.eqChartInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const data = r.equityCurve
      const isPositive = data.length > 1 && (data[data.length - 1].value || 0) >= (data[0].value || 0)
      const lineColor = isPositive ? '#52c41a' : '#f5222d'
      this.eqChartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.85)' : '#333', fontSize: 12 }
        },
        grid: { left: 60, right: 20, top: 15, bottom: 25 },
        xAxis: {
          type: 'category',
          data: data.map(d => d.time || ''),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 10 },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: dk ? 'rgba(255,255,255,0.35)' : '#999',
            fontSize: 11,
            formatter: v => '$' + (v / 1000).toFixed(1) + 'k'
          },
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
      this._onResize = () => { if (this.eqChartInstance) this.eqChartInstance.resize() }
      window.addEventListener('resize', this._onResize)
    },

    // ===== Watchlist =====
    filterWatchlistOption (input, option) {
      const val = (option.componentOptions.propsData.value || '').toLowerCase()
      if (val === '__add__') return true
      return val.includes(input.toLowerCase())
    },
    handleWatchlistChange (val) {
      if (val === '__add__') {
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
    getMarketColor (m) {
      const colors = { Crypto: 'orange', USStock: 'blue', CNStock: 'magenta', HKStock: 'red', Forex: 'green', Futures: 'purple', PredictionMarket: 'cyan' }
      return colors[m] || 'default'
    },
    marketLabel (m) {
      if (!m) return ''
      const key = 'dashboard.indicator.market.' + m
      const t = this.$t(key)
      return t !== key ? t : m
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
      } finally {
        this.addSearching = false
      }
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
        await this.loadWatchlist()
        this.selectedWatchlistKey = `${mkt}:${item.symbol}`
        this.market = mkt
        this.symbol = item.symbol
        this.showAddModal = false
      } catch (e) {
        this.$message.error(e.message || 'Failed')
      } finally {
        this.addingStock = false
      }
    },

    applyDatePreset (p) {
      this.datePreset = p.key
      this.startDate = moment().subtract(p.days, 'days')
      this.endDate = moment()
    },

    applyRunRecordToBacktestForm (run) {
      if (!run) return
      if (run.initial_capital != null && !isNaN(Number(run.initial_capital))) {
        this.initialCapital = Number(run.initial_capital)
      }
      if (run.commission != null && !isNaN(Number(run.commission))) {
        this.commission = Number(run.commission) * 100
      }
      if (run.slippage != null && !isNaN(Number(run.slippage))) {
        this.slippage = Number(run.slippage) * 100
      }
      if (run.leverage != null) this.leverage = Math.max(1, parseInt(run.leverage, 10) || 1)
      if (run.trade_direction) this.tradeDirection = String(run.trade_direction)
    },

    applyBacktestRunToIde (run) {
      if (!run) return
      this.showHistoryDrawer = false

      const snap = run.config_snapshot || {}
      const runIndId = run.indicator_id != null ? Number(run.indicator_id) : (snap.indicatorId != null ? Number(snap.indicatorId) : null)
      if (runIndId && Number(this.selectedIndicatorId) !== runIndId) {
        const exists = this.indicators.some(i => Number(i.id) === runIndId)
        if (exists) {
          this.selectedIndicatorId = runIndId
          this.onIndicatorChange(runIndId)
          this.$message.info(this.$t('indicatorIde.historyRunSwitchedIndicator', { id: runIndId }))
        } else {
          this.$message.warning(this.$t('indicatorIde.historyRunIndicatorMissing', { id: runIndId }))
        }
      }

      if (run.market) this.market = String(run.market)
      if (run.symbol) {
        this.symbol = String(run.symbol)
        this.qtSymbol = String(run.symbol)
      }
      if (this.market && this.symbol) {
        this.selectedWatchlistKey = `${this.market}:${this.symbol}`
      }
      if (run.timeframe) this.timeframe = String(run.timeframe)

      const sd = run.start_date
      const ed = run.end_date
      if (sd) this.startDate = moment(String(sd).slice(0, 10), 'YYYY-MM-DD')
      if (ed) this.endDate = moment(String(ed).slice(0, 10), 'YYYY-MM-DD')

      this.applyRunRecordToBacktestForm(run)

      const res = run.result || {}
      const ok = run.status === 'success' && res && typeof res === 'object' && Object.keys(res).length > 0
      if (ok) {
        this.result = res
        this.hasResult = true
        this.backtestRunId = run.id
      } else if (run.status === 'failed') {
        this.result = { ...(typeof res === 'object' ? res : {}), errorMessage: run.error_message || run.errorMessage }
        this.hasResult = true
        this.backtestRunId = run.id
      } else {
        this.result = typeof res === 'object' ? res : {}
        this.hasResult = Object.keys(this.result).length > 0
        this.backtestRunId = run.id
      }

      this.resultTab = 'backtest'
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.hasResult) {
            this.renderEquityChart()
            this.renderBacktestSignals()
          }
        }, 200)
      })
      this.ensureChartReady()
      this.$message.success(this.$t('indicatorIde.historyRunLoaded'))
    },

    // ===== Backtest paired trade: exit reason tag (TP/SL/liquidation/signal) =====
    exitTagLabel (record) {
      const ty = String(record.closeType || '').toLowerCase().replace(/-/g, '_')
      const reason = String(record.closeReason || '').toLowerCase()

      if (ty === 'liquidation' || reason.includes('liquidat')) {
        return this.$t('indicatorIde.exitTagLiquidation')
      }
      if (ty.includes('trailing') || reason.includes('trailing')) {
        return this.$t('indicatorIde.exitTagTrailing')
      }
      if (ty.endsWith('_stop') || reason.includes('server_stop_loss') || reason.includes('stop_loss')) {
        return this.$t('indicatorIde.exitTagStopLoss')
      }
      if (ty.includes('profit') || reason.includes('server_take_profit') || reason.includes('take_profit')) {
        return this.$t('indicatorIde.exitTagTakeProfit')
      }
      if (ty.startsWith('reduce_')) {
        return this.$t('indicatorIde.exitTagReduce')
      }
      if (ty.startsWith('add_')) {
        return this.$t('indicatorIde.exitTagAdd')
      }
      if (ty === 'close_long' || ty === 'close_short' || ty === 'sell' || ty === 'buy' || reason.includes('signal_exit')) {
        return this.$t('indicatorIde.exitTagSignal')
      }
      if (record.closeReason) {
        return String(record.closeReason)
      }
      return this.$t('indicatorIde.exitTagOther')
    },
    exitTagColor (record) {
      const ty = String(record.closeType || '').toLowerCase()
      const reason = String(record.closeReason || '').toLowerCase()
      if (ty === 'liquidation' || reason.includes('liquidat')) return 'red'
      if (ty.endsWith('_stop') || reason.includes('server_stop_loss') || reason.includes('stop_loss')) return 'volcano'
      if (ty.includes('profit') || reason.includes('server_take_profit') || reason.includes('take_profit')) return 'green'
      if (ty.includes('trailing') || reason.includes('trailing')) return 'blue'
      if (ty.startsWith('reduce_')) return 'purple'
      if (ty.startsWith('add_')) return 'cyan'
      if (ty === 'close_long' || ty === 'close_short' || ty === 'sell' || ty === 'buy') return 'geekblue'
      return 'default'
    },

    // ===== Format helpers =====
    fmtPct (v) {
      if (v == null || isNaN(v)) return '--'
      return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%'
    },
    fmtMoney (v) {
      if (v == null || isNaN(v)) return '$0.00'
      const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return (v >= 0 ? '' : '-') + '$' + abs
    },
    fmtMoney2 (v) {
      if (v == null || isNaN(v)) return '0.00'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    fmtElapsed (s) {
      return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
    },
    fmtPrice (v) {
      if (v == null || isNaN(v)) return '--'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
  },
  watch: {
    activeIndicators: {
      deep: true,
      handler () {
        this.schedulePersistIdeUiState()
      }
    },
    market () {
      this.schedulePersistIdeUiState()
    },
    selectedIndicatorId () {
      this.schedulePersistIdeUiState()
    },
    selectedWatchlistKey () {
      this.schedulePersistIdeUiState()
    },
    userId () {
      this.loadPurchasedMarketHintDismissed()
    },
    selectedIndicatorIsPurchased () {
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    isDarkTheme () {
      if (this.cmInstance) this.cmInstance.setOption('theme', this.isDarkTheme ? 'monokai' : 'eclipse')
      if (this.hasResult) this.$nextTick(() => this.renderEquityChart())
    },
    codeDrawerVisible () {
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
        if (this.eqChartInstance) this.eqChartInstance.resize()
        this.ensureChartReady()
      })
    },
    quickTradeDrawerVisible () {
      this.$nextTick(() => this.ensureChartReady())
    },
    paramsPanelExpanded () {
      this.$nextTick(() => this.ensureChartReady())
    },
    symbol () {
      this.qtSymbol = this.symbol
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    timeframe () {
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    resultTab (val) {
      if (val === 'backtest' && this.hasResult) {
        this.$nextTick(() => {
          if (this.eqChartInstance) {
            this.eqChartInstance.resize()
          } else {
            this.renderEquityChart()
          }
        })
      }
    },
    aiGenerating (val) {
      if (val) {
        this.ideAiTipIndex = 0
        this.ideAiTipTimer = setInterval(() => {
          this.ideAiTipIndex = (this.ideAiTipIndex + 1) % this.ideAiTips.length
        }, 3000)
      } else {
        if (this.ideAiTipTimer) {
          clearInterval(this.ideAiTipTimer)
          this.ideAiTipTimer = null
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.indicator-ide {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 64px);
  height: auto;
  padding: 0;
  background: #fff;
}

// ===== Toolbar =====
.ide-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%);
  flex-shrink: 0;
  gap: 10px;
  box-shadow: 0 1px 0 rgba(24, 144, 255, 0.04);
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
}
.ide-toolbar-qt-btn {
  border-radius: 10px !important;
  font-weight: 600;
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  height: 34px !important;
  padding: 0 12px !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.ide-toolbar-qt-label {
  font-size: 13px;
  letter-spacing: 0.02em;
}
/* 与右侧带标签的工具组垂直居中对齐（避免单独贴在行底） */
.ide-toolbar-code-slot {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  align-self: center;
}
.ide-toolbar-icon-btn {
  flex-shrink: 0;
  border-radius: 8px !important;
  width: 32px;
  height: 32px !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.ide-toolbar-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
  padding: 6px 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.ide-toolbar-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  line-height: 1;
  white-space: nowrap;
}
.ide-toolbar-select {
  min-width: 0;
  /deep/ .ant-select-selection {
    border-radius: 8px;
    border-color: #e2e8f0;
    box-shadow: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  /deep/ .ant-select-selection:hover,
  /deep/ .ant-select-focused .ant-select-selection {
    border-color: @primary-color;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.12);
  }
}
.ide-toolbar-select--watchlist {
  width: 220px;
  max-width: 36vw;
}
.ide-toolbar-select--indicator {
  width: 200px;
  max-width: 32vw;
}
.ide-toolbar-group--indicator {
  flex-wrap: wrap;
  align-items: center;
  row-gap: 6px;
}
.ide-purchased-hint {
  margin: 0 0 10px 0;
  border-radius: 8px;
}
.ide-watchlist-add-row {
  text-align: center;
  color: @primary-color;
  font-weight: 500;
}
.tf-group {
  flex-shrink: 0;
  /deep/ .ant-radio-button-wrapper {
    padding: 0 9px;
    font-size: 12px;
    height: 30px;
    line-height: 28px;
    border-color: #e2e8f0;
    color: #475569;
  }
  /deep/ .ant-radio-button-wrapper:first-child {
    border-radius: 8px 0 0 8px;
  }
  /deep/ .ant-radio-button-wrapper:last-child {
    border-radius: 0 8px 8px 0;
  }
}
.ide-tf-seg {
  /deep/ .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    border-color: #096dd9 !important;
    color: #fff !important;
    box-shadow: 0 1px 4px rgba(24, 144, 255, 0.35);
    z-index: 1;
  }
}

// ===== Main =====
.ide-main { display: flex; flex: 1 1 auto; overflow: visible; min-height: 0; align-items: flex-start; }

.ide-left {
  width: 30%;
  min-width: 280px;
  max-width: 400px;
  height: calc(100vh - 64px - 56px);
  max-height: calc(100vh - 64px - 56px);
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eee;
  overflow: hidden;
  flex-shrink: 0;
  background: #fcfcfd;
  position: sticky;
  top: 0;
  align-self: flex-start;
}

// ===== Code Panel =====
.code-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &.collapsed { flex: 0 0 auto; }
}
.code-panel-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.code-editor-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }

// ===== AI Loading Overlay on code editor =====
.code-ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.code-ai-overlay-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}
.code-ai-overlay-dots {
  display: flex; gap: 4px;
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #1890ff; animation: ide-dot-bounce 1.4s ease-in-out infinite; }
  .dot1 { animation-delay: 0s; }
  .dot2 { animation-delay: 0.2s; }
  .dot3 { animation-delay: 0.4s; }
}
.code-ai-overlay-tip {
  font-size: 11px;
  color: #8c8c8c;
  max-width: 220px;
  text-align: center;
  animation: tip-fade 3s ease-in-out infinite;
}
@keyframes ide-dot-bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes tip-fade {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.panel-title-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  /deep/ .ant-btn-sm {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 13px;
    border-color: #e0e0e0;
    &:hover { border-color: @primary-color; color: @primary-color; }
    &[disabled] { opacity: 0.35; }
  }
}
.ide-guide-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 11px;
  color: #8c8c8c;
  background: #f8f9fb;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  > .anticon { color: #bfbfbf; font-size: 12px; }
}
.ide-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #1890ff;
  background: rgba(24, 144, 255, 0.06);
  border: 1px solid rgba(24, 144, 255, 0.2);
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    color: #fff;
    background: #1890ff;
    border-color: #1890ff;
  }
}

// ===== Code Editor Scrollbar =====
.code-editor-area {
  flex: 1;
  overflow: auto;
  &::-webkit-scrollbar { width: 5px; height: 5px; }
  &::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  /deep/ .CodeMirror {
    height: 100%;
    font-size: 12px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    line-height: 1.55;
  }
  /deep/ .CodeMirror-vscrollbar,
  /deep/ .CodeMirror-hscrollbar {
    &::-webkit-scrollbar { width: 5px; height: 5px; }
    &::-webkit-scrollbar-thumb { background: #c8c8c8; border-radius: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
  }
}

// ===== AI Panel =====
.ai-gen-panel { flex-shrink: 0; border-top: 1px solid #eee; }
.ai-gen-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.ai-gen-body { padding: 8px 10px 10px; }
.ai-gen-body /deep/ .ai-prompt-input textarea {
  min-height: 132px;
  line-height: 1.45;
}
.ai-helper-tip {
  margin-bottom: 6px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.ai-helper-links {
  margin-top: 6px;
  font-size: 11px;
}

.code-quality-panel {
  flex-shrink: 0;
  margin-top: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid #eee;
}
.code-quality-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}
.code-quality-title {
  font-size: 11px;
  font-weight: 600;
  color: #445066;
}
.code-quality-recheck { padding: 0 !important; height: auto !important; font-size: 11px !important; }
.code-quality-spin { display: block; margin: 8px 0; }
.code-quality-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.5;
  color: #595959;
}
.code-quality-list li { margin-bottom: 4px; }
.quality-hint--error { color: #cf1322; }
.quality-hint--warn { color: #d46b08; }
.quality-hint--info { color: #096dd9; }

.ai-debug-card {
  margin: 10px 10px 0;
  padding: 0;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  font-size: 12px;
}
.ai-debug-card--success { border-color: #b7eb8f; }
.ai-debug-card--warning { border-color: #ffd591; }

.ai-debug-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.ai-debug-card--success .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, transparent 100%);
}
.ai-debug-card--warning .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(250, 140, 22, 0.06) 0%, transparent 100%);
}

.ai-debug-card__badge {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; flex-shrink: 0; font-size: 13px;
  background: rgba(24, 144, 255, 0.1); color: #1890ff;
}
.ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.1); color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.1); color: #d46b08; }

.ai-debug-card__headline {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px;
}
.ai-debug-card__tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: #1890ff; white-space: nowrap;
}
.ai-debug-card--success .ai-debug-card__tag { color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__tag { color: #d46b08; }

.ai-debug-card__title {
  font-size: 12px; font-weight: 600; color: #262626;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ai-debug-card__dismiss {
  flex-shrink: 0; cursor: pointer; font-size: 12px; color: #bfbfbf;
  padding: 2px; border-radius: 4px; transition: all 0.15s;
  &:hover { color: #595959; background: rgba(0,0,0,0.04); }
}

.ai-debug-card__chips {
  display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 10px 0;
}
.ai-debug-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
  background: rgba(24, 144, 255, 0.08); color: #1890ff;
}
.ai-debug-chip--success { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
.ai-debug-chip--warning { background: rgba(250, 140, 22, 0.08); color: #d46b08; }
.ai-debug-chip--info { background: rgba(24, 144, 255, 0.08); color: #1890ff; }

.ai-debug-card__body {
  padding: 8px 10px 0; line-height: 1.6; color: #595959;
}

.ai-debug-card__group {
  padding: 6px 10px;
  &:last-child { padding-bottom: 10px; }
}
.ai-debug-card__group-label {
  font-size: 11px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;
  color: #389e0d;
}
.ai-debug-card__group--remaining .ai-debug-card__group-label { color: #d46b08; }

.ai-debug-card__item {
  display: flex; align-items: baseline; gap: 6px;
  padding: 2px 0; font-size: 11px; line-height: 1.5; color: #595959;
}
.ai-debug-card__bullet {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
}
.ai-debug-card__bullet--green { background: #52c41a; }
.ai-debug-card__bullet--orange { background: #fa8c16; }

// ===== Params =====
.params-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }
}
.params-scroll--right { padding: 12px 16px 10px; min-width: 0; }

.param-section {
  margin-bottom: 0;
  padding: 12px 12px 12px;
  border-bottom: none;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  min-width: 0;
  overflow: hidden;
}
.param-section--full { grid-column: 1 / -1; }

.direction-radio-group {
  display: flex !important;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  /deep/ .ant-radio-button-wrapper {
    flex: 1 1 calc(33.333% - 6px);
    min-width: 120px;
    text-align: center;
    height: 34px;
    line-height: 32px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 8px !important;
    border: 1px solid #e8e8e8 !important;
    background: #fafafa;
    color: #8c8c8c;
    transition: all 0.2s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 0 !important;
    &::before { display: none !important; }
    &:hover {
      color: #595959;
      border-color: #d0d0d0 !important;
    }
    .anticon { margin-right: 3px; }
  }
  /deep/ .ant-radio-button-wrapper-checked {
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
    &[value="long"],
    &:nth-child(1) {
      background: linear-gradient(135deg, #52c41a, #73d13d) !important;
    }
    &[value="short"],
    &:nth-child(2) {
      background: linear-gradient(135deg, #f5222d, #ff4d4f) !important;
    }
    &[value="both"],
    &:nth-child(3) {
      background: linear-gradient(135deg, #1890ff, #40a9ff) !important;
    }
  }
}
.param-strategy-hint {
  margin-top: 10px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.param-label {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}
.field-label { font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
.date-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  /deep/ .ant-btn-sm {
    border-radius: 999px;
    padding: 0 12px;
    height: 28px;
    font-size: 12px;
    font-weight: 600;
    border-color: #e2e8f0;
    color: #475569;
  }
  /deep/ .ant-btn-primary.ant-btn-sm {
    border-color: transparent;
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.28);
  }
}

@media (max-width: 1500px) {
  .params-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .param-section--full {
    grid-column: auto;
  }
}

@media (max-width: 1280px) {
  .direction-radio-group /deep/ .ant-radio-button-wrapper {
    flex-basis: calc(50% - 4px);
  }
}

@media (max-width: 1100px) {
  .direction-radio-group /deep/ .ant-radio-button-wrapper {
    flex-basis: 100%;
    min-width: 0;
  }
}

// ===== Right Panel =====
.ide-right { flex: 1; display: flex; flex-direction: column; overflow: visible; min-width: 0; }

/* 闪电交易：主布局内右侧栏，与 .ide-left 同为抽拉分栏（无全屏遮罩） */
.ide-quick-right {
  width: 30%;
  min-width: 280px;
  max-width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8e8e8;
  background: #f8fafc;
  overflow: hidden;
  min-height: 0;
  align-self: stretch;
}
.ide-quick-panel-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.ide-quick-panel-head-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
}
.ide-quick-panel-head-icon {
  font-size: 16px;
  color: @primary-color;
}
.ide-quick-panel-close {
  color: #64748b !important;
  padding: 0 4px !important;
  &:hover {
    color: #0f172a !important;
  }
}
.ide-quick-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 0 8px;
  /deep/ .quick-trade-panel-root {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  /deep/ .quick-trade-embedded {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  /deep/ .qt-embedded-split--cols {
    flex-direction: column;
    padding-left: 12px;
    padding-right: 12px;
  }
  /deep/ .qt-embedded-split--cols .qt-embedded-col-left,
  /deep/ .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
    margin-left: 0;
  }
  /deep/ .qt-embedded-split--cols .qt-embedded-col-right {
    border-left: none;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    padding-top: 12px;
  }
}

.ide-resize-handle {
  flex: 0 0 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  background: #f0f0f0;
  border-top: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
  transition: background 0.15s;
  &:hover { background: #e2e2e2; }
  &:active { background: #d4d4d4; }
}
.ide-resize-handle-dots {
  display: block;
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: #c0c0c0;
}

.chart-panel {
  flex: none;
  min-height: 160px;
  overflow: hidden;
  /deep/ .chart-left,
  /deep/ .chart-wrapper,
  /deep/ .chart-content-area,
  /deep/ .kline-chart-container {
    height: 100% !important;
    min-height: 0 !important;
  }
  /deep/ .chart-left {
    width: 100% !important;
    flex: 1 1 100% !important;
    border-right: none !important;
  }
}

.result-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
  padding: 0 14px 0;
}
.params-card {
  flex-shrink: 0;
  margin: 12px 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.params-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.07) 0%, rgba(24, 144, 255, 0.02) 100%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  transition: background 0.15s;
  &:hover { background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.03) 100%); }
}
.params-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  /deep/ .anticon { color: @primary-color; font-size: 15px; }
}
.params-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  /deep/ .ant-btn-sm {
    border-radius: 8px;
    font-weight: 600;
  }
  /deep/ .ant-btn-primary.ant-btn-sm {
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.28);
  }
  > .anticon {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    &:hover { color: @primary-color; background: rgba(24, 144, 255, 0.08); }
  }
}
.params-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}
.result-tabs {
  flex: 0 0 auto;
  min-height: auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
  /deep/ .ant-tabs-bar {
    margin-bottom: 0;
    flex-shrink: 0;
    background: #fff;
    z-index: 2;
  }
  /deep/ .ant-tabs-tab { font-size: 13px; }
  /* animated=false 时内容区无 margin/transform，可与 flex+滚动安全共用 */
  /deep/ .ant-tabs-content {
    flex: 0 0 auto;
    min-height: auto;
    overflow: visible;
    padding: 10px 0 14px;
  }
}

.result-running {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  .running-time { font-size: 24px; font-weight: 300; color: @primary-color; font-variant-numeric: tabular-nums; }
  .running-tip { font-size: 12px; color: #8c8c8c; }
}
.result-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  p { font-size: 12px; color: #8c8c8c; margin: 0; }
}
.result-data {
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .metric-card {
    background: #fafbfc; border-radius: 8px; padding: 10px 8px; text-align: center; border: 1px solid #f0f0f0;
    transition: transform 0.15s, box-shadow 0.15s;
    &:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
    .metric-label { font-size: 10px; color: #8c8c8c; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
    .metric-value { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; color: #333; line-height: 1.2; }
    &.positive .metric-value { color: #52c41a; }
    &.negative .metric-value { color: #f5222d; }
  }
}
.ai-optimize-card {
  margin-top: 16px;
  margin-bottom: 8px;
}
.ai-optimize-card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, rgba(114, 46, 209, 0.04) 100%);
  border: 1px solid rgba(24, 144, 255, 0.15);
}
.ai-optimize-card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}
.ai-optimize-card-body {
  flex: 1;
  min-width: 0;
}
.ai-optimize-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}
.ai-optimize-card-desc {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
  line-height: 1.4;
}
.eq-section { margin-bottom: 14px; }
.eq-title, .trades-title {
  font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; display: flex; align-items: center;
  .trades-count { font-weight: 400; font-size: 12px; color: #999; margin-left: 4px; }
}
.equity-chart { width: 100%; height: 200px; border-radius: 8px; }

.ide-tuning-launch {
  padding: 14px;
}
.ide-tuning-launch-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.04) 0%, rgba(114, 46, 209, 0.03) 100%);
  border: 1px solid rgba(24, 144, 255, 0.08);
}
.ide-tuning-launch-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  color: #fff;
  font-size: 17px;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(24, 144, 255, 0.25);
}
.ide-tuning-launch-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}
.ide-tuning-launch-subtitle {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
  line-height: 1.5;
}
.ide-tuning-method-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ide-tuning-method-card {
  position: relative;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s ease;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: #722ed1; border-radius: 3px 0 0 3px;
    opacity: 0; transition: opacity 0.25s;
  }
  &:hover {
    border-color: rgba(114, 46, 209, 0.2);
    box-shadow: 0 4px 12px rgba(114, 46, 209, 0.08);
    transform: translateY(-1px);
    &::before { opacity: 1; }
  }
}
.ide-tuning-method-card--ai {
  border-color: rgba(24, 144, 255, 0.12);
  background: linear-gradient(165deg, #fff 0%, rgba(24, 144, 255, 0.02) 100%);
  &::before { background: linear-gradient(180deg, #1890ff, #40a9ff); }
  &:hover {
    border-color: rgba(24, 144, 255, 0.25);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
  }
}
.ide-tuning-method-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ide-tuning-method-icon {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 7px; font-size: 14px; flex-shrink: 0;
  &.ide-tuning-method-icon--grid {
    color: #722ed1; background: rgba(114, 46, 209, 0.08);
  }
  &.ide-tuning-method-icon--ai {
    color: #1890ff; background: rgba(24, 144, 255, 0.08);
  }
}
.ide-tuning-method-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.ide-tuning-method-desc {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.6;
  margin-bottom: 10px;
}
.ide-tuning-method-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.experiment-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.experiment-stage-row,
.experiment-candidate-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.experiment-stage-card,
.experiment-candidate-card,
.experiment-detail-card,
.experiment-segment-card {
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-stage-card {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.experiment-stage-card.is-done {
  border-color: rgba(24, 144, 255, 0.28);
  background: rgba(24, 144, 255, 0.05);
}
.experiment-stage-index {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e6f4ff;
  color: #1890ff;
  font-size: 12px;
  font-weight: 700;
}
.experiment-stage-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}
.experiment-action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  /deep/ .ant-btn {
    border-radius: 6px;
  }
}
.experiment-action-bar--split {
  flex-wrap: wrap;
}
.structured-tune-row {
  width: 100%;
  /deep/ .ant-radio-group {
    display: flex;
    width: 100%;
  }
  /deep/ .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
    font-size: 12px;
  }
}
.experiment-hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7fbff 0%, #fafcff 100%);
}
.experiment-hero-main {
  flex: 1;
  min-width: 0;
}
.experiment-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #8c8c8c;
  margin-bottom: 4px;
}
.experiment-regime-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 20px;
  font-weight: 700;
  color: #1f1f1f;
}
.experiment-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #595959;
}
.experiment-family-tags {
  margin-top: 10px;
  /deep/ .ant-tag {
    margin-bottom: 6px;
    border-radius: 999px;
  }
}
.experiment-best-score {
  width: 120px;
  flex-shrink: 0;
  text-align: right;
}
.experiment-score {
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: @primary-color;
}
.experiment-grade {
  margin-top: 4px;
  font-size: 13px;
  color: #8c8c8c;
}
.experiment-feature-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.experiment-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
  gap: 12px;
}
.experiment-feature-card,
.experiment-best-card,
.experiment-ranking-card,
.experiment-segment-card,
.experiment-detail-card {
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-feature-card {
  padding: 12px;
}
.experiment-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
}
.experiment-best-card,
.experiment-ranking-card,
.experiment-segment-card,
.experiment-detail-card {
  padding: 14px;
}
.experiment-segment-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.experiment-segment-item {
  display: flex;
  gap: 10px;
}
.experiment-segment-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #1890ff;
  flex-shrink: 0;
}
.experiment-segment-content {
  flex: 1;
  min-width: 0;
}
.experiment-segment-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #333;
  span {
    color: #8c8c8c;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-segment-time {
  margin-top: 2px;
  font-size: 11px;
  color: #8c8c8c;
}
.experiment-best-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.experiment-best-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  span {
    font-size: 11px;
    color: #8c8c8c;
  }
  strong {
    font-size: 15px;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-override-tags {
  margin-top: 12px;
  /deep/ .ant-tag {
    margin-bottom: 6px;
    border-radius: 999px;
  }
}
.experiment-best-actions {
  margin-top: 12px;
}
.experiment-candidate-card {
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: rgba(24, 144, 255, 0.35);
    transform: translateY(-1px);
  }
  &.active {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.08);
    background: #f4faff;
  }
}
.experiment-candidate-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.experiment-candidate-name {
  font-size: 13px;
  font-weight: 700;
  color: #1f1f1f;
}
.experiment-candidate-source,
.experiment-detail-source {
  margin-top: 3px;
  font-size: 11px;
  color: #8c8c8c;
}
.experiment-candidate-score {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 700;
  color: @primary-color;
}
.experiment-candidate-stats {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #595959;
}
.experiment-detail-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.experiment-detail-actions {
  display: flex;
  gap: 8px;
  /deep/ .ant-btn {
    border-radius: 6px;
  }
}
.experiment-detail-metrics,
.experiment-component-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.experiment-detail-metric,
.experiment-component-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  span {
    display: block;
    font-size: 11px;
    color: #8c8c8c;
  }
  strong {
    display: block;
    margin-top: 4px;
    font-size: 15px;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-detail-block {
  margin-top: 14px;
}
.experiment-detail-block-title {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}
.exp-table-name { font-weight: 600; }
.exp-table-source { font-size: 11px; color: #8c8c8c; }
.exp-table-score { font-weight: 700; color: #1890ff; }

.experiment-progress-bar {
  padding: 16px;
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-progress-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  .running-time { margin-left: auto; color: #1890ff; font-variant-numeric: tabular-nums; }
}
.experiment-live-hint {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
  line-height: 1.45;
  margin: -4px 0 10px 28px;
}
.experiment-round-scores {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.experiment-round-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #f0f0f0;
  color: #595959;
  &.best { background: #e6f7ff; color: #1890ff; }
}
.experiment-round-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.experiment-round-card {
  flex: 1;
  min-width: 120px;
  padding: 10px 14px;
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
  display: flex;
  align-items: center;
  gap: 10px;
  &.best { border-color: rgba(24, 144, 255, 0.35); background: #f4faff; }
}
.experiment-round-num {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.08);
  color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.experiment-round-score { font-size: 18px; font-weight: 700; color: #1890ff; }
.experiment-round-meta { font-size: 11px; color: #8c8c8c; }
.experiment-reasoning {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #595959;
  font-style: italic;
}
.experiment-candidate-reasoning {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.4;
  color: #8c8c8c;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.publish-form {
  .publish-hint {
    margin-top: 6px;
    font-size: 12px;
    color: #8c8c8c;
  }
}

.add-item-active { background: #e6f7ff !important; }

.date-presets /deep/ .ant-btn-primary,
.date-presets /deep/ .ant-btn-primary:hover,
.date-presets /deep/ .ant-btn-primary:focus,
.date-presets /deep/ .ant-btn-primary:active {
  color: #fff;
}

// ===== Watchlist option (selected value in toolbar) =====
/deep/ .wl-opt-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  margin-right: 4px;
  vertical-align: middle;
}
/deep/ .wl-mkt-crypto { background: #fa8c16; }
/deep/ .wl-mkt-usstock { background: #1890ff; }
/deep/ .wl-mkt-cnstock { background: #eb2f96; }
/deep/ .wl-mkt-hkstock { background: #f5222d; }
/deep/ .wl-mkt-forex { background: #52c41a; }
/deep/ .wl-mkt-futures { background: #722ed1; }
/deep/ .wl-mkt-predictionmarket { background: #13c2c2; }
/deep/ .wl-opt-symbol { font-weight: 600; font-size: 12px; }
/deep/ .wl-opt-name { color: #8c8c8c; font-size: 10px; margin-left: 3px; }

// ===== Dark Theme =====
&.theme-dark {
  background: #141414;
  .ide-toolbar {
    background: linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%);
    border-bottom-color: #303030;
    box-shadow: 0 1px 0 rgba(24, 144, 255, 0.06);
  }
  .ide-toolbar-group {
    background: rgba(255, 255, 255, 0.04);
    border-color: #363636;
    box-shadow: none;
  }
  .ide-toolbar-label { color: rgba(255, 255, 255, 0.45); }
  .ide-toolbar-icon-btn {
    background: #262626;
    border-color: #434343;
    box-shadow: none;
  }
  .tf-group /deep/ .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
  }
  .ide-left { background: #181818; border-right-color: #303030; }
  .ide-toolbar-qt-btn.ant-btn-default {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.85);
    box-shadow: none;
    &:hover {
      border-color: #177ddc;
      color: #58a6ff;
    }
  }
  .ide-quick-right {
    background: #141414;
    border-left-color: #303030;
  }
  .ide-quick-panel-head {
    background: linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%);
    border-bottom-color: #303030;
  }
  .ide-quick-panel-head-title {
    color: rgba(255, 255, 255, 0.92);
  }
  .ide-quick-panel-head-icon {
    color: #58a6ff;
  }
  .ide-quick-panel-close {
    color: rgba(255, 255, 255, 0.45) !important;
    &:hover {
      color: rgba(255, 255, 255, 0.88) !important;
    }
  }
  .ide-quick-panel-body {
    /deep/ .qt-embedded-split--cols .qt-embedded-col-right {
      border-top-color: #303030;
    }
  }
  .ide-tuning-launch-header {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, rgba(114, 46, 209, 0.04) 100%);
    border-color: rgba(88, 166, 255, 0.12);
  }
  .ide-tuning-launch-title { color: rgba(255, 255, 255, 0.88); }
  .ide-tuning-launch-subtitle { color: rgba(255, 255, 255, 0.45); }
  .ide-tuning-method-card {
    background: #1f1f1f;
    border-color: #363636;
    box-shadow: none;
    &::before { opacity: 0; }
    &:hover { border-color: rgba(114, 46, 209, 0.35); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); transform: translateY(-1px); &::before { opacity: 1; } }
  }
  .ide-tuning-method-card--ai {
    background: linear-gradient(165deg, #1f1f1f 0%, rgba(23, 125, 220, 0.06) 100%);
    border-color: rgba(88, 166, 255, 0.2);
    &:hover { border-color: rgba(88, 166, 255, 0.35); }
  }
  .ide-tuning-method-icon {
    &.ide-tuning-method-icon--grid { background: rgba(114, 46, 209, 0.12); }
    &.ide-tuning-method-icon--ai { background: rgba(24, 144, 255, 0.12); }
  }
  .ide-tuning-method-name { color: rgba(255, 255, 255, 0.85); }
  .ide-tuning-method-desc { color: rgba(255, 255, 255, 0.45); }
  .ai-optimize-card-inner {
    background: linear-gradient(135deg, rgba(23, 125, 220, 0.1) 0%, rgba(114, 46, 209, 0.06) 100%);
    border-color: rgba(88, 166, 255, 0.2);
  }
  .ai-optimize-card-title { color: rgba(255, 255, 255, 0.88); }
  .ai-optimize-card-desc { color: rgba(255, 255, 255, 0.45); }
  .panel-title { color: rgba(255,255,255,0.85); border-bottom-color: #303030; &:hover { background: rgba(255,255,255,0.04); } }
  .ai-gen-panel { border-top-color: #303030; }
  .ai-gen-header { color: rgba(255,255,255,0.85); &:hover { background: rgba(255,255,255,0.04); } }
  .code-ai-overlay { background: rgba(20,20,20,0.82); }
  .code-ai-overlay-inner { color: #58a6ff; }
  .code-ai-overlay-dots .dot { background: #58a6ff; }
  .code-ai-overlay-tip { color: rgba(255,255,255,0.45); }
  .params-scroll { &::-webkit-scrollbar-thumb { background: #434343; } }
  .param-section { border-bottom-color: #303030; }
  .param-label { color: rgba(255,255,255,0.78); }
  .field-label { color: rgba(255,255,255,0.58); }
  .chart-panel { border-bottom-color: #303030; }
  .ide-resize-handle {
    background: #1f1f1f;
    border-top-color: #303030;
    border-bottom-color: #303030;
    &:hover { background: #2a2a2a; }
    &:active { background: #333; }
  }
  .ide-resize-handle-dots { background: #555; }
  .result-tabs /deep/ .ant-tabs-bar { background: #141414; }
  .result-tabs /deep/ .ant-tabs-content {
    &::-webkit-scrollbar-thumb { background: #434343; }
  }
  .params-card {
    background: linear-gradient(165deg, #262626 0%, #1f1f1f 100%);
    border-color: #363636;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  }
  .params-card-header {
    background: linear-gradient(135deg, rgba(23, 125, 220, 0.12) 0%, rgba(23, 125, 220, 0.04) 100%);
    border-bottom-color: #303030;
    &:hover {
      background: linear-gradient(135deg, rgba(23, 125, 220, 0.16) 0%, rgba(23, 125, 220, 0.06) 100%);
    }
  }
  .params-card-title { color: rgba(255,255,255,0.88); }
  .param-section {
    background: #1a1a1a;
    border-color: #333;
    box-shadow: none;
  }
  .param-label { color: rgba(255, 255, 255, 0.78); }
  .date-presets /deep/ .ant-btn-sm {
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    background: #262626;
  }
  .date-presets /deep/ .ant-btn-primary,
  .date-presets /deep/ .ant-btn-primary:hover,
  .date-presets /deep/ .ant-btn-primary:focus,
  .date-presets /deep/ .ant-btn-primary:active {
    color: #fff;
  }
  .params-card-actions > .anticon {
    color: rgba(255, 255, 255, 0.55);
    &:hover { color: rgba(255, 255, 255, 0.88); }
  }
  .param-strategy-hint { color: rgba(255, 255, 255, 0.45); }
  .direction-radio-group /deep/ .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.55);
    &:hover {
      color: rgba(255, 255, 255, 0.85);
      border-color: #555 !important;
    }
  }
  .ide-guide-bar {
    background: #1a1a1a;
    border-bottom-color: #303030;
    color: rgba(255, 255, 255, 0.45);
    > .anticon { color: rgba(255, 255, 255, 0.3); }
  }
  .ide-guide-link {
    color: #58a6ff;
    background: rgba(88, 166, 255, 0.1);
    border-color: rgba(88, 166, 255, 0.25);
    &:hover {
      color: #fff;
      background: #177ddc;
      border-color: #177ddc;
    }
  }
  .ai-helper-tip, .publish-form .publish-hint { color: rgba(255,255,255,0.45); }
  .code-quality-panel { border-top-color: #303030; }
  .code-quality-title { color: rgba(255,255,255,0.78); }
  .code-quality-list { color: rgba(255,255,255,0.55); }
  .ai-debug-card {
    border-color: #303030; background: #1f1f1f;
  }
  .ai-debug-card--success { border-color: rgba(82, 196, 26, 0.25); }
  .ai-debug-card--warning { border-color: rgba(250, 140, 22, 0.3); }
  .ai-debug-card__header { background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, transparent 100%); border-bottom-color: #303030; }
  .ai-debug-card--success .ai-debug-card__header { background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, transparent 100%); }
  .ai-debug-card--warning .ai-debug-card__header { background: linear-gradient(135deg, rgba(250, 140, 22, 0.08) 0%, transparent 100%); }
  .ai-debug-card__badge { background: rgba(24, 144, 255, 0.15); }
  .ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.15); }
  .ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.15); }
  .ai-debug-card__title { color: rgba(255,255,255,0.9); }
  .ai-debug-card__dismiss { color: rgba(255,255,255,0.3); &:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); } }
  .ai-debug-chip { background: rgba(24, 144, 255, 0.12); }
  .ai-debug-chip--success { background: rgba(82, 196, 26, 0.12); }
  .ai-debug-chip--warning { background: rgba(250, 140, 22, 0.12); }
  .ai-debug-card__body, .ai-debug-card__item { color: rgba(255,255,255,0.65); }
  .ai-debug-card__group-label { color: #73d13d; }
  .ai-debug-card__group--remaining .ai-debug-card__group-label { color: #ffa940; }
  .quality-hint--error { color: #ff7875; }
  .quality-hint--warn { color: #ffc069; }
  .quality-hint--info { color: #69c0ff; }
  .result-running { .running-time { color: #177ddc; } .running-tip { color: rgba(255,255,255,0.45); } }
  .result-empty { p { color: rgba(255,255,255,0.45); } }
  .result-data {
    .metric-card {
      background: #1f1f1f; border-color: #303030;
      &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
      .metric-label { color: rgba(255,255,255,0.45); }
      .metric-value { color: rgba(255,255,255,0.85); }
      &.positive .metric-value { color: #49aa19; }
      &.negative .metric-value { color: #d32029; }
    }
  }
  .experiment-hero,
  .experiment-feature-card,
  .experiment-best-card,
  .experiment-ranking-card,
  .experiment-stage-card,
  .experiment-candidate-card,
  .experiment-detail-card,
  .experiment-segment-card { background: #1f1f1f; border-color: #303030; }
  .experiment-regime-title,
  .experiment-section-title,
  .experiment-stage-title,
  .experiment-candidate-name,
  .experiment-segment-title { color: rgba(255,255,255,0.88); }
  .experiment-hint,
  .experiment-grade,
  .experiment-kicker,
  .experiment-candidate-source,
  .experiment-detail-source,
  .experiment-segment-time,
  .experiment-detail-block-title { color: rgba(255,255,255,0.45); }
  .experiment-segment-title span { color: rgba(255,255,255,0.45); }
  .experiment-stage-card.is-done { background: rgba(23, 125, 220, 0.12); border-color: rgba(23, 125, 220, 0.3); }
  .experiment-stage-index { background: rgba(23, 125, 220, 0.16); color: #58a6ff; }
  .experiment-action-bar /deep/ .ant-btn-default,
  .experiment-detail-actions /deep/ .ant-btn-default,
  .experiment-best-actions /deep/ .ant-btn-default {
    background: #181818;
    border-color: #434343;
    color: rgba(255,255,255,0.72);
    &:hover {
      border-color: #177ddc;
      color: #177ddc;
    }
  }
  .experiment-best-metric {
    background: #181818;
    border-color: #303030;
    span { color: rgba(255,255,255,0.45); }
    strong { color: rgba(255,255,255,0.88); }
  }
  .experiment-detail-metric,
  .experiment-component-card {
    background: #181818;
    border-color: #303030;
    span { color: rgba(255,255,255,0.45); }
    strong { color: rgba(255,255,255,0.88); }
  }
  .experiment-candidate-card.active {
    border-color: #177ddc;
    box-shadow: 0 0 0 2px rgba(23, 125, 220, 0.14);
    background: rgba(23, 125, 220, 0.08);
  }
  .experiment-candidate-card:hover { border-color: rgba(23, 125, 220, 0.45); background: rgba(23, 125, 220, 0.04); }
  .experiment-candidate-score { color: #58a6ff; }
  .experiment-candidate-stats { color: rgba(255,255,255,0.65); }
  .experiment-feature-card {
    .metric-label { color: rgba(255,255,255,0.45); }
    .metric-value { color: rgba(255,255,255,0.88); }
  }
  .experiment-score { color: #58a6ff; }
  .experiment-best-summary .experiment-best-metric {
    border: 1px solid #303030;
  }
  .experiment-overview-grid {
    .experiment-feature-card { border-color: #303030; }
  }
  .experiment-segment-dot { background: #58a6ff; }
  .exp-table-source { color: rgba(255,255,255,0.35); }
  .exp-table-score { color: #58a6ff; }
  .exp-table-name { color: rgba(255,255,255,0.88); }
  .experiment-progress-bar { background: #1f1f1f; border-color: #303030; color: rgba(255,255,255,0.85); }
  .experiment-progress-header { color: rgba(255,255,255,0.85); .running-time { color: #58a6ff; } }
  .experiment-live-hint { color: rgba(255,255,255,0.45); }
  .experiment-round-badge { background: #303030; color: rgba(255,255,255,0.65); &.best { background: rgba(23, 125, 220, 0.15); color: #58a6ff; } }
  .experiment-round-card { background: #1f1f1f; border-color: #303030; &.best { border-color: rgba(23, 125, 220, 0.35); background: rgba(23, 125, 220, 0.06); } }
  .experiment-round-num { background: rgba(23, 125, 220, 0.15); color: #58a6ff; }
  .experiment-round-score { color: #58a6ff; }
  .experiment-round-meta { color: rgba(255,255,255,0.35); }
  .experiment-reasoning { color: rgba(255,255,255,0.45); }
  .experiment-candidate-reasoning { color: rgba(255,255,255,0.35); }
  .eq-title, .trades-title { color: rgba(255,255,255,0.85); .trades-count { color: rgba(255,255,255,0.45); } }
  .panel-title-actions /deep/ .ant-btn:not(.ant-btn-primary) {
    background: #1f1f1f;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    &:hover:not([disabled]) {
      border-color: #177ddc;
      color: #177ddc;
    }
  }
  .code-editor-area {
    &::-webkit-scrollbar-thumb { background: #434343; }
    /deep/ .CodeMirror-vscrollbar,
    /deep/ .CodeMirror-hscrollbar {
      &::-webkit-scrollbar-thumb { background: #434343; }
    }
  }
  .result-panel {
    &::-webkit-scrollbar-thumb { background: #434343; }
  }

  /deep/ .ant-tabs-bar { border-bottom-color: #303030; }
  /deep/ .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  /deep/ .ant-tabs-tab-active { color: #177ddc !important; }
  /deep/ .ant-tabs-ink-bar { background: #177ddc; }
  /deep/ .ant-select .ant-select-selection {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85);
    .ant-select-arrow { color: rgba(255,255,255,0.45); }
    &:hover { border-color: #177ddc; }
  }
  /deep/ .ant-select-selection__placeholder { color: rgba(255,255,255,0.35); }
  /deep/ .ant-input, /deep/ .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: #177ddc; } }
  /deep/ .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  /deep/ .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: #177ddc; } }
  /deep/ .ant-calendar-picker-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  /deep/ .ant-calendar-picker-icon { color: rgba(255,255,255,0.45); }
  /deep/ .ant-radio-button-wrapper {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { color: #177ddc; }
    &.ant-radio-button-wrapper-checked { background: #177ddc; border-color: #177ddc; color: #fff; }
  }
  /deep/ .ant-checkbox-wrapper { color: rgba(255,255,255,0.85); }
  /deep/ .ant-checkbox-inner { background: #1f1f1f; border-color: #434343; }
  /deep/ .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: #177ddc; color: #177ddc; } }
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
}
</style>

<style lang="less">
/* ===== Watchlist dropdown ===== */
.ide-watchlist-dropdown {
  .ant-select-dropdown-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
  }
  .wl-opt-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    line-height: 18px;
    padding: 0 6px;
    border-radius: 3px;
    flex-shrink: 0;
    color: #fff;
    letter-spacing: 0.3px;
  }
  .wl-mkt-crypto { background: #fa8c16; }
  .wl-mkt-usstock { background: #1890ff; }
  .wl-mkt-cnstock { background: #eb2f96; }
  .wl-mkt-hkstock { background: #f5222d; }
  .wl-mkt-forex { background: #52c41a; }
  .wl-mkt-futures { background: #722ed1; }
  .wl-mkt-predictionmarket { background: #13c2c2; }
  .wl-opt-symbol {
    font-weight: 600;
    font-size: 13px;
    color: #333;
  }
  .wl-opt-name {
    color: #8c8c8c;
    font-size: 11px;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ant-select-dropdown-menu-item-selected {
    background: #e6f7ff;
    .wl-opt-symbol { color: #1890ff; }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: #f5f5f5;
  }
}
.ide-watchlist-dropdown--dark {
  background: #1f1f1f;
  .ant-select-dropdown-menu-item {
    color: rgba(255,255,255,0.85);
  }
  .wl-opt-symbol { color: rgba(255,255,255,0.88); }
  .wl-opt-name { color: rgba(255,255,255,0.45); }
  .ant-select-dropdown-menu-item-selected {
    background: rgba(23, 125, 220, 0.2);
    .wl-opt-symbol { color: #177ddc; }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: rgba(255,255,255,0.06);
  }
}

.ide-modal-wrap--dark {
  .ant-modal-content { background: #1f1f1f; box-shadow: 0 8px 32px rgba(0,0,0,0.55); }
  .ant-modal-header { background: #1f1f1f; border-bottom-color: #303030; }
  .ant-modal-title { color: rgba(255,255,255,0.88); }
  .ant-modal-close { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.88); } }
  .ant-modal-body { background: #1f1f1f; color: rgba(255,255,255,0.85); }
  .ant-modal-footer { background: #1f1f1f; border-top-color: #303030; }
  .ant-tabs-bar { border-bottom-color: #303030; }
  .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  .ant-tabs-tab-active { color: #177ddc !important; }
  .ant-input-search .ant-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.88); &:hover, &:focus { border-color: #177ddc; } }
  .ant-input-search-icon { color: rgba(255,255,255,0.45); }
  .ant-list-item { color: rgba(255,255,255,0.85); border-bottom-color: #303030; }
  .ant-list-item:hover { background: rgba(255,255,255,0.04); }
  .ant-input, .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: #177ddc; } }
  .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: #177ddc; } }
  .ant-radio-wrapper { color: rgba(255,255,255,0.85); }
  .ant-radio-inner { background: #1f1f1f; border-color: #434343; }
  .ant-radio-checked .ant-radio-inner { border-color: #177ddc; &::after { background-color: #177ddc; } }
  .ant-select-selection { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  .ant-switch { background-color: rgba(255,255,255,0.2); }
  .ant-switch-checked { background-color: #177ddc; }
  .ant-alert-info { background: rgba(23, 125, 220, 0.1); border-color: rgba(23, 125, 220, 0.3); }
  .ant-alert-message { color: rgba(255,255,255,0.85); }
  .ant-alert-info .ant-alert-icon { color: #177ddc; }
  .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: #177ddc; color: #177ddc; } }
  .ant-btn-primary { background: #177ddc; border-color: #177ddc; }
  .ant-btn-danger.ant-btn-background-ghost { border-color: #d32029; color: #d32029; &:hover { border-color: #ff4d4f; color: #ff4d4f; } }
  .field-label { color: rgba(255,255,255,0.58); }
  .publish-hint { color: rgba(255,255,255,0.45); }
  .editor-content { color: rgba(255,255,255,0.85); }
  .ant-row { color: rgba(255,255,255,0.85); }
}
</style>
