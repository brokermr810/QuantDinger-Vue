<template>
  <div class="user-manage-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="team" />
        <span>{{ $t('userManage.title') || 'User Management' }}</span>
      </h2>
      <p class="page-desc">{{ $t('userManage.description') || 'Manage system users, roles and permissions' }}</p>
    </div>

    <!-- Tabs -->
    <a-tabs v-model="activeTab" @change="handleTabChange" class="manage-tabs">
      <!-- Tab 1: User Management -->
      <a-tab-pane key="users" :tab="$t('userManage.tabUsers') || 'User Management'">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button type="primary" @click="showCreateModal">
              <a-icon type="user-add" />
              {{ $t('userManage.createUser') || 'Create User' }}
            </a-button>
            <a-button @click="loadUsers">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="searchKeyword"
              class="toolbar-search"
              :placeholder="$t('userManage.searchPlaceholder') || 'Search by username/email'"
              allowClear
              @search="handleSearch"
              @pressEnter="handleSearch"
            />
          </div>
        </div>

        <!-- User Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="columns"
            :dataSource="users"
            :loading="loading"
            :pagination="pagination"
            :rowKey="record => record.id"
            :scroll="{ x: 1280 }"
            @change="handleTableChange"
          >
            <!-- Status Column -->
            <template slot="status" slot-scope="text">
              <a-tag :color="text === 'active' ? 'green' : 'red'">
                {{ text === 'active' ? ($t('userManage.active') || 'Active') : ($t('userManage.disabled') || 'Disabled') }}
              </a-tag>
            </template>

            <!-- Role Column -->
            <template slot="role" slot-scope="text">
              <a-tag :color="getRoleColor(text)">
                {{ getRoleLabel(text) }}
              </a-tag>
            </template>

            <!-- Last Login Column -->
            <template slot="last_login_at" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">{{ $t('userManage.neverLogin') || 'Never' }}</span>
            </template>

            <!-- Credits Column -->
            <template slot="credits" slot-scope="text">
              <span class="credits-value">{{ formatCredits(text) }}</span>
            </template>

            <!-- VIP Column -->
            <template slot="vip_expires_at" slot-scope="text">
              <template v-if="text && isVipActive(text)">
                <a-tag color="gold">
                  <a-icon type="crown" />
                  {{ formatDate(text) }}
                </a-tag>
              </template>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Actions Column -->
            <template slot="action" slot-scope="text, record">
              <a-space>
                <a-tooltip :title="$t('common.edit') || 'Edit'">
                  <a-button type="link" size="small" @click="showEditModal(record)">
                    <a-icon type="edit" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.adjustCredits') || 'Adjust Credits'">
                  <a-button type="link" size="small" @click="showCreditsModal(record)">
                    <a-icon type="wallet" style="color: #722ed1" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.setVip') || 'Set VIP'">
                  <a-button type="link" size="small" @click="showVipModal(record)">
                    <a-icon type="crown" style="color: #faad14" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.resetPassword') || 'Reset Password'">
                  <a-button type="link" size="small" @click="showResetPasswordModal(record)">
                    <a-icon type="key" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('common.delete') || 'Delete'">
                  <a-popconfirm
                    :title="$t('userManage.confirmDelete') || 'Are you sure to delete this user?'"
                    @confirm="handleDelete(record.id)"
                  >
                    <a-button type="link" size="small" :disabled="record.id === currentUserId">
                      <a-icon type="delete" style="color: #ff4d4f" />
                    </a-button>
                  </a-popconfirm>
                </a-tooltip>
              </a-space>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 2: System Strategy Overview -->
      <a-tab-pane key="strategies" :tab="$t('systemOverview.tabTitle') || 'System Overview'">
        <!-- Summary Cards -->
        <div class="summary-cards" v-if="strategySummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="fund" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.total_strategies || 0 }}</div>
              <div class="summary-label">{{ $t('systemOverview.totalStrategies') || 'Total Strategies' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="play-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.running_strategies || 0 }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ strategySummary.running_live_strategies || 0 }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ strategySummary.running_signal_strategies || 0 }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.runningStrategies') || 'Running' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="dollar" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(strategySummary.total_capital) }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ formatNumber(strategySummary.live_capital) }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ formatNumber(strategySummary.signal_capital) }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.totalCapital') || 'Total Capital' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" :style="{ background: (strategySummary.total_pnl || 0) >= 0 ? 'linear-gradient(135deg, #11998e, #38ef7d)' : 'linear-gradient(135deg, #ff416c, #ff4b2b)' }">
              <a-icon type="rise" />
            </div>
            <div class="summary-info">
              <div class="summary-value" :class="(strategySummary.total_pnl || 0) >= 0 ? 'text-profit' : 'text-loss'">
                {{ formatPnl(strategySummary.total_pnl) }}
                <span class="roi-badge">{{ strategySummary.total_roi || 0 }}%</span>
              </div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ formatPnl(strategySummary.live_pnl) }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ formatPnl(strategySummary.signal_pnl) }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.totalPnl') || 'Total PnL' }}</div>
            </div>
          </div>
        </div>

        <!-- Strategy Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadSystemStrategies">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
            <a-select v-model="strategyStatusFilter" class="toolbar-select" @change="handleStrategyFilterChange">
              <a-select-option value="all">{{ $t('systemOverview.filterAll') || 'All Status' }}</a-select-option>
              <a-select-option value="running">{{ $t('systemOverview.filterRunning') || 'Running' }}</a-select-option>
              <a-select-option value="stopped">{{ $t('systemOverview.filterStopped') || 'Stopped' }}</a-select-option>
            </a-select>
            <a-select v-model="strategyExecutionFilter" class="toolbar-select" @change="handleStrategyExecutionFilterChange">
              <a-select-option value="all">{{ $t('systemOverview.filterExecAll') || 'All modes' }}</a-select-option>
              <a-select-option value="live">{{ $t('systemOverview.live') || 'Live' }}</a-select-option>
              <a-select-option value="signal">{{ $t('systemOverview.signal') || 'Signal' }}</a-select-option>
            </a-select>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="strategySearchKeyword"
              class="toolbar-search"
              :placeholder="$t('systemOverview.searchPlaceholder') || 'Search strategy/symbol/user'"
              allowClear
              @search="handleStrategySearch"
              @pressEnter="handleStrategySearch"
            />
          </div>
        </div>

        <!-- Strategy Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="strategyColumns"
            :dataSource="systemStrategies"
            :loading="strategyLoading"
            :pagination="strategyPagination"
            :rowKey="record => record.id"
            :scroll="{ x: 1920 }"
            @change="handleStrategyTableChange"
          >
            <!-- Strategy Status -->
            <template slot="strategyStatus" slot-scope="text">
              <span class="status-cell">
                <span class="status-dot" :class="text === 'running' ? 'dot-running' : 'dot-stopped'" />
                <span :class="text === 'running' ? 'status-running' : 'status-stopped'">
                  {{ text === 'running' ? ($t('systemOverview.running') || 'Running') : ($t('systemOverview.stopped') || 'Stopped') }}
                </span>
              </span>
            </template>

            <!-- User Column -->
            <template slot="userInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-')">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 8) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Symbol Column -->
            <template slot="symbolInfo" slot-scope="text, record">
              <div>
                <span class="symbol-text">{{ record.symbol || '-' }}</span>
                <a-tag v-if="record.cs_strategy_type === 'cross_sectional'" color="purple" size="small" style="margin-left: 4px">CS</a-tag>
              </div>
              <div v-if="record.cs_strategy_type === 'cross_sectional' && record.symbol_list && record.symbol_list.length" class="symbol-count text-muted">
                {{ record.symbol_list.length }} {{ $t('systemOverview.symbols') || 'symbols' }}
              </div>
            </template>

            <!-- Capital Column -->
            <template slot="capitalInfo" slot-scope="text">
              <span>{{ formatNumber(text) }}</span>
            </template>

            <!-- Execution mode -->
            <template slot="executionModeInfo" slot-scope="text">
              <a-tag v-if="text === 'live'" color="green" size="small">{{ $t('systemOverview.live') || 'Live' }}</a-tag>
              <a-tag v-else-if="text === 'signal'" color="blue" size="small">{{ $t('systemOverview.signal') || 'Signal' }}</a-tag>
              <a-tag v-else size="small">{{ text || '—' }}</a-tag>
            </template>

            <!-- Position equity (live book value; from open positions) -->
            <template slot="equityInfo" slot-scope="text, record">
              <span v-if="record.execution_mode === 'live'">{{ formatNumber(text || 0) }}</span>
              <span v-else class="text-muted">—</span>
            </template>

            <!-- PnL Column -->
            <template slot="pnlInfo" slot-scope="text, record">
              <div :class="record.total_pnl >= 0 ? 'text-profit' : 'text-loss'">
                <span class="pnl-value">{{ formatPnl(record.total_pnl) }}</span>
                <span class="roi-text">({{ record.roi >= 0 ? '+' : '' }}{{ record.roi }}%)</span>
              </div>
              <div class="pnl-detail text-muted">
                <span>{{ $t('systemOverview.realized') || 'Real' }}: {{ formatPnl(record.total_realized_pnl) }}</span>
                <span style="margin-left: 8px">{{ $t('systemOverview.unrealized') || 'Unreal' }}: {{ formatPnl(record.total_unrealized_pnl) }}</span>
              </div>
            </template>

            <!-- Positions Column -->
            <template slot="positionInfo" slot-scope="text, record">
              <a-badge :count="record.position_count" :numberStyle="{ backgroundColor: record.position_count > 0 ? '#52c41a' : '#d9d9d9' }" />
            </template>

            <!-- Trades Column -->
            <template slot="tradeInfo" slot-scope="text">
              <span>{{ text || 0 }}</span>
            </template>

            <!-- Indicator Column -->
            <template slot="indicatorInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="indicator-name">{{ truncate(text, 16) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Exchange Column -->
            <template slot="exchangeInfo" slot-scope="text">
              <span v-if="text" class="exchange-name">{{ text }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Timeframe Column -->
            <template slot="timeframeInfo" slot-scope="text">
              <a-tag v-if="text" size="small">{{ text }}</a-tag>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Leverage Column -->
            <template slot="leverageInfo" slot-scope="text">
              <span v-if="text > 1" style="color: #fa8c16; font-weight: 600">{{ text }}x</span>
              <span v-else>{{ text || 1 }}x</span>
            </template>

            <!-- Created At Column -->
            <template slot="createdAtInfo" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Updated At Column -->
            <template slot="updatedAtInfo" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 3: Order List -->
      <a-tab-pane key="orders" :tab="$t('adminOrders.tabTitle') || 'Order List'">
        <!-- Order Summary Cards -->
        <div class="summary-cards" v-if="orderSummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="file-text" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.total_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.totalOrders') || 'Total Orders' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="check-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.paid_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.paidOrders') || 'Paid' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="clock-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.pending_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.pendingOrders') || 'Pending' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
              <a-icon type="dollar" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(orderSummary.total_revenue) }} <span style="font-size: 13px; color: #999;">USDT</span></div>
              <div class="summary-label">{{ $t('adminOrders.totalRevenue') || 'Total Revenue' }}</div>
            </div>
          </div>
        </div>

        <!-- Order Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadOrders">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
            <a-select v-model="orderStatusFilter" class="toolbar-select" @change="handleOrderFilterChange">
              <a-select-option value="all">{{ $t('adminOrders.filterAll') || 'All Status' }}</a-select-option>
              <a-select-option value="pending">{{ $t('adminOrders.filterPending') || 'Pending' }}</a-select-option>
              <a-select-option value="paid">{{ $t('adminOrders.filterPaid') || 'Paid' }}</a-select-option>
              <a-select-option value="confirmed">{{ $t('adminOrders.filterConfirmed') || 'Confirmed' }}</a-select-option>
              <a-select-option value="expired">{{ $t('adminOrders.filterExpired') || 'Expired' }}</a-select-option>
            </a-select>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="orderSearchKeyword"
              class="toolbar-search"
              :placeholder="$t('adminOrders.searchPlaceholder') || 'Search by username/email'"
              allowClear
              @search="handleOrderSearch"
              @pressEnter="handleOrderSearch"
            />
          </div>
        </div>

        <!-- Order Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="orderColumns"
            :dataSource="orders"
            :loading="orderLoading"
            :pagination="orderPagination"
            :rowKey="record => record.order_type + '-' + record.id"
            :scroll="{ x: 1400 }"
            @change="handleOrderTableChange"
          >
            <!-- User Column -->
            <template slot="orderUserInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-') + ' (' + (record.user_email || '') + ')'">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 10) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Order Type Column -->
            <template slot="orderTypeInfo" slot-scope="text">
              <a-tag :color="text === 'usdt' ? 'green' : 'blue'">
                {{ text === 'usdt' ? 'USDT' : 'Mock' }}
              </a-tag>
            </template>

            <!-- Plan Column -->
            <template slot="planInfo" slot-scope="text">
              <a-tag :color="text === 'lifetime' ? 'gold' : text === 'yearly' ? 'purple' : 'cyan'">
                {{ text === 'lifetime' ? ($t('adminOrders.lifetime') || 'Lifetime') : text === 'yearly' ? ($t('adminOrders.yearly') || 'Yearly') : ($t('adminOrders.monthly') || 'Monthly') }}
              </a-tag>
            </template>

            <!-- Amount Column -->
            <template slot="amountInfo" slot-scope="text, record">
              <span style="font-weight: 600;">{{ text }}</span>
              <span class="text-muted" style="margin-left: 4px;">{{ record.currency }}</span>
            </template>

            <!-- Status Column -->
            <template slot="orderStatusInfo" slot-scope="text">
              <a-tag :color="getOrderStatusColor(text)">{{ getOrderStatusLabel(text) }}</a-tag>
            </template>

            <!-- Chain Column -->
            <template slot="chainInfo" slot-scope="text">
              <span v-if="text">{{ text }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Address Column -->
            <template slot="addressInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="address-text">{{ truncate(text, 12) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Tx Hash Column -->
            <template slot="txHashInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="hash-text">{{ truncate(text, 14) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Created At Column -->
            <template slot="orderCreatedAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 4: AI Analysis Records -->
      <a-tab-pane key="aiStats" :tab="$t('adminAiStats.tabTitle') || 'AI Analysis'">
        <!-- AI Stats Summary Cards -->
        <div class="summary-cards" v-if="aiStatsSummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="thunderbolt" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ aiStatsSummary.total_analyses || 0 }}</div>
              <div class="summary-label">{{ $t('adminAiStats.totalAnalyses') || 'Total Analyses' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="team" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ aiStatsSummary.unique_users || 0 }}</div>
              <div class="summary-label">{{ $t('adminAiStats.activeUsers') || 'Active Users' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="stock" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ aiStatsSummary.unique_symbols || 0 }}</div>
              <div class="summary-label">{{ $t('adminAiStats.uniqueSymbols') || 'Symbols Analyzed' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
              <a-icon type="like" />
            </div>
            <div class="summary-info">
              <div class="summary-value">
                {{ aiStatsSummary.correct_count || 0 }}
                <span style="font-size: 13px; color: #999;">/ {{ aiStatsSummary.total_memory || 0 }}</span>
              </div>
              <div class="summary-label">{{ $t('adminAiStats.accuracy') || 'Correct / Verified' }}</div>
            </div>
          </div>
        </div>

        <!-- AI Stats Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadAiStats">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="aiStatsSearchKeyword"
              class="toolbar-search"
              :placeholder="$t('adminAiStats.searchPlaceholder') || 'Search by username'"
              allowClear
              @search="handleAiStatsSearch"
              @pressEnter="handleAiStatsSearch"
            />
          </div>
        </div>

        <!-- Per-User AI Stats Table -->
        <a-card :bordered="false" class="user-table-card" style="margin-bottom: 20px;">
          <h4 class="section-card-title">
            <a-icon type="bar-chart" class="section-card-title-icon" />
            {{ $t('adminAiStats.userStatsTitle') || 'Per-User Statistics' }}
          </h4>
          <a-table
            :columns="aiUserColumns"
            :dataSource="aiUserStats"
            :loading="aiStatsLoading"
            :pagination="aiStatsPagination"
            :rowKey="record => record.user_id"
            :scroll="{ x: 960 }"
            @change="handleAiStatsTableChange"
          >
            <!-- User Column -->
            <template slot="aiUserInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-') + ' (' + (record.email || '') + ')'">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 10) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Analysis Count -->
            <template slot="analysisCountInfo" slot-scope="text">
              <span style="font-weight: 600; color: #1890ff;">{{ text || 0 }}</span>
            </template>

            <!-- Correct/Incorrect -->
            <template slot="accuracyInfo" slot-scope="text, record">
              <span class="text-profit">{{ record.correct || 0 }}</span>
              <span class="text-muted"> / </span>
              <span class="text-loss">{{ record.incorrect || 0 }}</span>
            </template>

            <!-- Feedback -->
            <template slot="feedbackInfo" slot-scope="text, record">
              <a-tooltip :title="($t('adminAiStats.helpful') || 'Helpful') + ' / ' + ($t('adminAiStats.notHelpful') || 'Not Helpful')">
                <span style="color: #52c41a;"><a-icon type="like" /> {{ record.helpful || 0 }}</span>
                <span class="text-muted"> / </span>
                <span style="color: #ff4d4f;"><a-icon type="dislike" /> {{ record.not_helpful || 0 }}</span>
              </a-tooltip>
            </template>

            <!-- Last Analysis At -->
            <template slot="lastAnalysisAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>

        <!-- Recent Analysis Records -->
        <a-card :bordered="false" class="user-table-card">
          <h4 class="section-card-title">
            <a-icon type="history" class="section-card-title-icon" />
            {{ $t('adminAiStats.recentTitle') || 'Recent Analysis Records' }}
          </h4>
          <a-table
            :columns="aiRecentColumns"
            :dataSource="aiRecentRecords"
            :loading="aiStatsLoading"
            :pagination="false"
            :rowKey="record => record.id"
            :scroll="{ x: 900 }"
            size="small"
          >
            <!-- User Column -->
            <template slot="recentUserInfo" slot-scope="text, record">
              <span class="user-cell">
                <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                  {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                </a-avatar>
                <span class="user-name">{{ truncate(record.nickname || record.username || '-', 8) }}</span>
              </span>
            </template>

            <!-- Status Column -->
            <template slot="recentStatusInfo" slot-scope="text">
              <a-tag :color="text === 'completed' ? 'green' : text === 'failed' ? 'red' : 'blue'">
                {{ text }}
              </a-tag>
            </template>

            <!-- Created At Column -->
            <template slot="recentCreatedAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <!-- Create/Edit User Modal -->
    <a-modal
      v-model="modalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="isEdit ? ($t('userManage.editUser') || 'Edit User') : ($t('userManage.createUser') || 'Create User')"
      :confirmLoading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form" layout="vertical">
        <a-form-item :label="$t('userManage.username') || 'Username'">
          <a-input
            v-decorator="['username', {
              rules: [{ required: !isEdit, message: $t('userManage.usernameRequired') || 'Please enter username' }]
            }]"
            :disabled="isEdit"
            :placeholder="$t('userManage.usernamePlaceholder') || 'Enter username'"
          >
            <a-icon slot="prefix" type="user" />
          </a-input>
        </a-form-item>

        <a-form-item v-if="!isEdit" :label="$t('userManage.password') || 'Password'">
          <a-input-password
            v-decorator="['password', {
              rules: [
                { required: true, message: $t('userManage.passwordRequired') || 'Please enter password' },
                { min: 6, message: $t('userManage.passwordMin') || 'Password must be at least 6 characters' }
              ]
            }]"
            :placeholder="$t('userManage.passwordPlaceholder') || 'Enter password (min 6 characters)'"
          >
            <a-icon slot="prefix" type="lock" />
          </a-input-password>
        </a-form-item>

        <a-form-item :label="$t('userManage.nickname') || 'Nickname'">
          <a-input
            v-decorator="['nickname']"
            :placeholder="$t('userManage.nicknamePlaceholder') || 'Enter nickname'"
          >
            <a-icon slot="prefix" type="smile" />
          </a-input>
        </a-form-item>

        <a-form-item :label="$t('userManage.email') || 'Email'">
          <a-input
            v-decorator="['email', {
              rules: [{ type: 'email', message: $t('userManage.emailInvalid') || 'Invalid email format' }]
            }]"
            :placeholder="$t('userManage.emailPlaceholder') || 'Enter email'"
          >
            <a-icon slot="prefix" type="mail" />
          </a-input>
        </a-form-item>

        <a-form-item :label="$t('userManage.role') || 'Role'">
          <a-select
            v-decorator="['role', { initialValue: 'user' }]"
            :placeholder="$t('userManage.rolePlaceholder') || 'Select role'"
          >
            <a-select-option v-for="role in roles" :key="role.id" :value="role.id">
              {{ getRoleLabel(role.id) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item v-if="isEdit" :label="$t('userManage.status') || 'Status'">
          <a-select
            v-decorator="['status', { initialValue: 'active' }]"
            :placeholder="$t('userManage.statusPlaceholder') || 'Select status'"
          >
            <a-select-option value="active">{{ $t('userManage.active') || 'Active' }}</a-select-option>
            <a-select-option value="disabled">{{ $t('userManage.disabled') || 'Disabled' }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Reset Password Modal -->
    <a-modal
      v-model="resetPasswordVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="$t('userManage.resetPassword') || 'Reset Password'"
      :confirmLoading="resetPasswordLoading"
      @ok="handleResetPassword"
    >
      <a-form :form="resetPasswordForm" layout="vertical">
        <a-alert
          :message="$t('userManage.resetPasswordWarning') || 'This will reset the user\'s password'"
          type="warning"
          showIcon
          style="margin-bottom: 16px"
        />
        <a-form-item :label="$t('userManage.newPassword') || 'New Password'">
          <a-input-password
            v-decorator="['new_password', {
              rules: [
                { required: true, message: $t('userManage.passwordRequired') || 'Please enter new password' },
                { min: 6, message: $t('userManage.passwordMin') || 'Password must be at least 6 characters' }
              ]
            }]"
            :placeholder="$t('userManage.newPasswordPlaceholder') || 'Enter new password'"
          >
            <a-icon slot="prefix" type="lock" />
          </a-input-password>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Adjust Credits Modal -->
    <a-modal
      v-model="creditsModalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="($t('userManage.adjustCredits') || 'Adjust Credits') + (creditsEditingUser ? ` - ${creditsEditingUser.username}` : '')"
      :confirmLoading="creditsLoading"
      @ok="handleSetCredits"
    >
      <a-form layout="vertical">
        <div class="current-credits-info" v-if="creditsEditingUser">
          <span class="label">{{ $t('userManage.currentCredits') || 'Current Credits' }}:</span>
          <span class="value">{{ formatCredits(creditsEditingUser.credits) }}</span>
        </div>
        <a-form-item :label="$t('userManage.newCredits') || 'New Credits'">
          <a-input-number
            v-model="newCredits"
            :min="0"
            :precision="2"
            style="width: 100%"
            :placeholder="$t('userManage.enterCredits') || 'Enter new credits amount'"
          />
        </a-form-item>
        <a-form-item :label="$t('userManage.remark') || 'Remark'">
          <a-input
            v-model="creditsRemark"
            :placeholder="$t('userManage.remarkPlaceholder') || 'Optional remark'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Set VIP Modal -->
    <a-modal
      v-model="vipModalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="($t('userManage.setVip') || 'Set VIP') + (vipEditingUser ? ` - ${vipEditingUser.username}` : '')"
      :confirmLoading="vipLoading"
      @ok="handleSetVip"
    >
      <a-form layout="vertical">
        <div class="current-vip-info" v-if="vipEditingUser && vipEditingUser.vip_expires_at">
          <span class="label">{{ $t('userManage.currentVip') || 'Current VIP' }}:</span>
          <span class="value" :class="isVipActive(vipEditingUser.vip_expires_at) ? 'active' : 'expired'">
            {{ isVipActive(vipEditingUser.vip_expires_at)
              ? ($t('userManage.vipActive') || 'Active') + ` (${formatDate(vipEditingUser.vip_expires_at)})`
              : ($t('userManage.vipExpired') || 'Expired') }}
          </span>
        </div>
        <a-form-item :label="$t('userManage.vipDays') || 'VIP Days'">
          <a-select v-model="vipDays" style="width: 100%">
            <a-select-option :value="0">{{ $t('userManage.cancelVip') || 'Cancel VIP' }}</a-select-option>
            <a-select-option :value="7">7 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="30">30 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="90">90 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="180">180 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="365">365 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="-1">{{ $t('userManage.customDate') || 'Custom Date' }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="vipDays === -1" :label="$t('userManage.vipExpiresAt') || 'VIP Expires At'">
          <a-date-picker
            v-model="vipCustomDate"
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item :label="$t('userManage.remark') || 'Remark'">
          <a-input
            v-model="vipRemark"
            :placeholder="$t('userManage.remarkPlaceholder') || 'Optional remark'"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { getUserList, createUser, updateUser, deleteUser, resetUserPassword, getRoles, setUserCredits, setUserVip, getSystemStrategies, getAdminOrders, getAdminAiStats } from '@/api/user'
import { baseMixin } from '@/store/app-mixin'
import { mapGetters } from 'vuex'

export default {
  name: 'UserManage',
  mixins: [baseMixin],
  data () {
    return {
      activeTab: 'users',
      loading: false,
      users: [],
      roles: [],
      searchKeyword: '',
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      // Create/Edit Modal
      modalVisible: false,
      modalLoading: false,
      isEdit: false,
      editingUser: null,
      // Reset Password Modal
      resetPasswordVisible: false,
      resetPasswordLoading: false,
      resetPasswordUserId: null,
      // Credits Modal
      creditsModalVisible: false,
      creditsLoading: false,
      creditsEditingUser: null,
      newCredits: 0,
      creditsRemark: '',
      // VIP Modal
      vipModalVisible: false,
      vipLoading: false,
      vipEditingUser: null,
      vipDays: 30,
      vipCustomDate: null,
      vipRemark: '',
      // System Strategy Overview
      strategyLoading: false,
      systemStrategies: [],
      strategySummary: null,
      strategyStatusFilter: 'all',
      strategyExecutionFilter: 'all',
      strategySortBy: '',
      strategySortOrder: 'desc',
      strategySearchKeyword: '',
      strategyPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      strategiesLoaded: false,
      // Order List
      orderLoading: false,
      orders: [],
      orderSummary: null,
      orderStatusFilter: 'all',
      orderSearchKeyword: '',
      orderPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      ordersLoaded: false,
      // AI Analysis Stats
      aiStatsLoading: false,
      aiUserStats: [],
      aiRecentRecords: [],
      aiStatsSummary: null,
      aiStatsSearchKeyword: '',
      aiStatsPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      aiStatsLoaded: false
    }
  },
  computed: {
    ...mapGetters(['userInfo']),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    userManageModalWrapClass () {
      return this.isDarkTheme ? 'user-manage-modal user-manage-modal-dark' : 'user-manage-modal'
    },
    currentUserId () {
      return this.userInfo?.id
    },
    columns () {
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          width: 60
        },
        {
          title: this.$t('userManage.username') || 'Username',
          dataIndex: 'username',
          width: 120
        },
        {
          title: this.$t('userManage.nickname') || 'Nickname',
          dataIndex: 'nickname',
          width: 100
        },
        {
          title: this.$t('userManage.email') || 'Email',
          dataIndex: 'email',
          width: 180
        },
        {
          title: this.$t('userManage.role') || 'Role',
          dataIndex: 'role',
          width: 90,
          scopedSlots: { customRender: 'role' }
        },
        {
          title: this.$t('userManage.credits') || 'Credits',
          dataIndex: 'credits',
          width: 100,
          scopedSlots: { customRender: 'credits' }
        },
        {
          title: 'VIP',
          dataIndex: 'vip_expires_at',
          width: 120,
          scopedSlots: { customRender: 'vip_expires_at' }
        },
        {
          title: this.$t('userManage.status') || 'Status',
          dataIndex: 'status',
          width: 90,
          scopedSlots: { customRender: 'status' }
        },
        {
          title: this.$t('userManage.lastLogin') || 'Last Login',
          dataIndex: 'last_login_at',
          width: 150,
          scopedSlots: { customRender: 'last_login_at' }
        },
        {
          title: this.$t('common.actions') || 'Actions',
          dataIndex: 'action',
          width: 180,
          scopedSlots: { customRender: 'action' }
        }
      ]
    },
    strategyColumns () {
      const so = (key) =>
        this.strategySortBy === key ? (this.strategySortOrder === 'asc' ? 'ascend' : 'descend') : false
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 72,
          fixed: 'left',
          sorter: true,
          sortOrder: so('id')
        },
        {
          title: this.$t('systemOverview.colUser') || 'User',
          dataIndex: 'username',
          key: 'username',
          width: 118,
          fixed: 'left',
          scopedSlots: { customRender: 'userInfo' }
        },
        {
          title: this.$t('systemOverview.colStrategy') || 'Strategy',
          dataIndex: 'strategy_name',
          key: 'strategy_name',
          width: 160,
          ellipsis: true,
          sorter: true,
          sortOrder: so('strategy_name')
        },
        {
          title: this.$t('systemOverview.colStatus') || 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 108,
          scopedSlots: { customRender: 'strategyStatus' },
          sorter: true,
          sortOrder: so('status')
        },
        {
          title: this.$t('systemOverview.colExecutionMode') || 'Mode',
          dataIndex: 'execution_mode',
          key: 'execution_mode',
          width: 96,
          align: 'center',
          scopedSlots: { customRender: 'executionModeInfo' },
          sorter: true,
          sortOrder: so('execution_mode')
        },
        {
          title: this.$t('systemOverview.colSymbol') || 'Symbol',
          dataIndex: 'symbol',
          key: 'symbol',
          width: 140,
          scopedSlots: { customRender: 'symbolInfo' },
          sorter: true,
          sortOrder: so('symbol')
        },
        {
          title: this.$t('systemOverview.colCapital') || 'Capital',
          dataIndex: 'initial_capital',
          key: 'initial_capital',
          width: 110,
          scopedSlots: { customRender: 'capitalInfo' },
          sorter: true,
          sortOrder: so('initial_capital')
        },
        {
          title: this.$t('systemOverview.colPositionEquity') || 'Pos. equity',
          dataIndex: 'total_equity',
          key: 'total_equity',
          width: 120,
          align: 'right',
          scopedSlots: { customRender: 'equityInfo' },
          sorter: true,
          sortOrder: so('total_equity')
        },
        {
          title: this.$t('systemOverview.colPnl') || 'PnL / ROI',
          dataIndex: 'total_pnl',
          key: 'total_pnl',
          width: 200,
          scopedSlots: { customRender: 'pnlInfo' },
          sorter: true,
          sortOrder: so('total_pnl')
        },
        {
          title: this.$t('systemOverview.colPositions') || 'Pos',
          dataIndex: 'position_count',
          key: 'position_count',
          width: 76,
          align: 'center',
          scopedSlots: { customRender: 'positionInfo' },
          sorter: true,
          sortOrder: so('position_count')
        },
        {
          title: this.$t('systemOverview.colTrades') || 'Trades',
          dataIndex: 'trade_count',
          key: 'trade_count',
          width: 88,
          align: 'center',
          scopedSlots: { customRender: 'tradeInfo' },
          sorter: true,
          sortOrder: so('trade_count')
        },
        {
          title: this.$t('systemOverview.colIndicator') || 'Indicator',
          dataIndex: 'indicator_name',
          key: 'indicator_name',
          width: 130,
          scopedSlots: { customRender: 'indicatorInfo' }
        },
        {
          title: this.$t('systemOverview.colExchange') || 'Exchange',
          dataIndex: 'exchange_name',
          key: 'exchange_name',
          width: 100,
          scopedSlots: { customRender: 'exchangeInfo' }
        },
        {
          title: this.$t('systemOverview.colTimeframe') || 'TF',
          dataIndex: 'timeframe',
          key: 'timeframe',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'timeframeInfo' }
        },
        {
          title: this.$t('systemOverview.colLeverage') || 'Lev',
          dataIndex: 'leverage',
          key: 'leverage',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'leverageInfo' },
          sorter: true,
          sortOrder: so('leverage')
        },
        {
          title: this.$t('systemOverview.colCreatedAt') || 'Created',
          dataIndex: 'created_at',
          key: 'created_at',
          width: 150,
          scopedSlots: { customRender: 'createdAtInfo' },
          sorter: true,
          sortOrder: so('created_at')
        },
        {
          title: this.$t('systemOverview.colUpdatedAt') || 'Updated',
          dataIndex: 'updated_at',
          key: 'updated_at',
          width: 150,
          scopedSlots: { customRender: 'updatedAtInfo' },
          sorter: true,
          sortOrder: so('updated_at')
        }
      ]
    },
    orderColumns () {
      return [
        {
          title: this.$t('adminOrders.colUser') || 'User',
          dataIndex: 'username',
          width: 120,
          scopedSlots: { customRender: 'orderUserInfo' }
        },
        {
          title: this.$t('adminOrders.colType') || 'Type',
          dataIndex: 'order_type',
          width: 80,
          scopedSlots: { customRender: 'orderTypeInfo' }
        },
        {
          title: this.$t('adminOrders.colPlan') || 'Plan',
          dataIndex: 'plan',
          width: 100,
          scopedSlots: { customRender: 'planInfo' }
        },
        {
          title: this.$t('adminOrders.colAmount') || 'Amount',
          dataIndex: 'amount',
          width: 120,
          scopedSlots: { customRender: 'amountInfo' }
        },
        {
          title: this.$t('adminOrders.colStatus') || 'Status',
          dataIndex: 'status',
          width: 100,
          scopedSlots: { customRender: 'orderStatusInfo' }
        },
        {
          title: this.$t('adminOrders.colChain') || 'Chain',
          dataIndex: 'chain',
          width: 80,
          scopedSlots: { customRender: 'chainInfo' }
        },
        {
          title: this.$t('adminOrders.colAddress') || 'Address',
          dataIndex: 'address',
          width: 140,
          scopedSlots: { customRender: 'addressInfo' }
        },
        {
          title: this.$t('adminOrders.colTxHash') || 'Tx Hash',
          dataIndex: 'tx_hash',
          width: 160,
          scopedSlots: { customRender: 'txHashInfo' }
        },
        {
          title: this.$t('adminOrders.colCreatedAt') || 'Created',
          dataIndex: 'created_at',
          width: 150,
          scopedSlots: { customRender: 'orderCreatedAt' }
        }
      ]
    },
    aiUserColumns () {
      return [
        {
          title: this.$t('adminAiStats.colUser') || 'User',
          dataIndex: 'username',
          width: 140,
          scopedSlots: { customRender: 'aiUserInfo' }
        },
        {
          title: this.$t('adminAiStats.colAnalysisCount') || 'Analyses',
          dataIndex: 'analysis_count',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'analysisCountInfo' },
          sorter: (a, b) => a.analysis_count - b.analysis_count,
          defaultSortOrder: 'descend'
        },
        {
          title: this.$t('adminAiStats.colSymbols') || 'Symbols',
          dataIndex: 'symbol_count',
          width: 90,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colMarkets') || 'Markets',
          dataIndex: 'market_count',
          width: 90,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colAccuracy') || 'Correct / Wrong',
          dataIndex: 'correct',
          width: 130,
          align: 'center',
          scopedSlots: { customRender: 'accuracyInfo' }
        },
        {
          title: this.$t('adminAiStats.colFeedback') || 'Feedback',
          dataIndex: 'helpful',
          width: 130,
          align: 'center',
          scopedSlots: { customRender: 'feedbackInfo' }
        },
        {
          title: this.$t('adminAiStats.colLastAnalysis') || 'Last Analysis',
          dataIndex: 'last_analysis_at',
          width: 160,
          scopedSlots: { customRender: 'lastAnalysisAt' }
        }
      ]
    },
    aiRecentColumns () {
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          width: 60
        },
        {
          title: this.$t('adminAiStats.colUser') || 'User',
          dataIndex: 'username',
          width: 120,
          scopedSlots: { customRender: 'recentUserInfo' }
        },
        {
          title: this.$t('adminAiStats.colMarket') || 'Market',
          dataIndex: 'market',
          width: 80
        },
        {
          title: this.$t('adminAiStats.colSymbol') || 'Symbol',
          dataIndex: 'symbol',
          width: 120
        },
        {
          title: this.$t('adminAiStats.colModel') || 'Model',
          dataIndex: 'model',
          width: 140,
          ellipsis: true
        },
        {
          title: this.$t('adminAiStats.colStatus') || 'Status',
          dataIndex: 'status',
          width: 100,
          scopedSlots: { customRender: 'recentStatusInfo' }
        },
        {
          title: this.$t('adminAiStats.colCreatedAt') || 'Time',
          dataIndex: 'created_at',
          width: 160,
          scopedSlots: { customRender: 'recentCreatedAt' }
        }
      ]
    }
  },
  beforeCreate () {
    this.form = this.$form.createForm(this)
    this.resetPasswordForm = this.$form.createForm(this, { name: 'resetPassword' })
  },
  mounted () {
    this.loadUsers()
    this.loadRoles()
  },
  methods: {
    handleTabChange (key) {
      if (key === 'strategies' && !this.strategiesLoaded) {
        this.loadSystemStrategies()
      }
      if (key === 'orders' && !this.ordersLoaded) {
        this.loadOrders()
      }
      if (key === 'aiStats' && !this.aiStatsLoaded) {
        this.loadAiStats()
      }
    },

    // ==================== System Strategy Overview ====================
    async loadSystemStrategies () {
      this.strategyLoading = true
      try {
        const params = {
          page: this.strategyPagination.current,
          page_size: this.strategyPagination.pageSize,
          status: this.strategyStatusFilter === 'all' ? '' : this.strategyStatusFilter,
          execution_mode: this.strategyExecutionFilter === 'all' ? '' : this.strategyExecutionFilter,
          search: this.strategySearchKeyword || ''
        }
        if (this.strategySortBy) {
          params.sort_by = this.strategySortBy
          params.sort_order = this.strategySortOrder
        }
        const res = await getSystemStrategies(params)
        if (res.code === 1) {
          this.systemStrategies = res.data.items || []
          this.strategyPagination.total = res.data.total || 0
          this.strategySummary = res.data.summary || {}
          this.strategiesLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load strategies')
        }
      } catch (error) {
        console.error('Failed to load system strategies:', error)
        this.$message.error('Failed to load system strategies')
      } finally {
        this.strategyLoading = false
      }
    },

    handleStrategySearch () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyFilterChange () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyExecutionFilterChange () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyTableChange (pagination, filters, sorter) {
      if (pagination) {
        this.strategyPagination.current = pagination.current
        this.strategyPagination.pageSize = pagination.pageSize
      }
      if (sorter && Object.keys(sorter).length) {
        if (sorter.order === 'ascend' || sorter.order === 'descend') {
          const key = sorter.columnKey != null ? String(sorter.columnKey) : String(sorter.field || '')
          this.strategySortBy = key
          this.strategySortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'
        } else {
          this.strategySortBy = ''
          this.strategySortOrder = 'desc'
        }
      }
      this.loadSystemStrategies()
    },

    getUserColor (userId) {
      const colors = ['#1890ff', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#2f54eb', '#faad14']
      return colors[(userId || 0) % colors.length]
    },

    formatNumber (num) {
      if (!num && num !== 0) return '0'
      return Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatPnl (pnl) {
      if (!pnl && pnl !== 0) return '0'
      const val = Number(pnl)
      const prefix = val >= 0 ? '+' : ''
      return prefix + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    },

    truncate (str, maxLen) {
      if (!str) return ''
      return str.length > maxLen ? str.substring(0, maxLen) + '...' : str
    },

    // ==================== User Management ====================
    async loadUsers () {
      this.loading = true
      try {
        const res = await getUserList({
          page: this.pagination.current,
          page_size: this.pagination.pageSize,
          search: this.searchKeyword || ''
        })
        if (res.code === 1) {
          this.users = res.data.items || []
          this.pagination.total = res.data.total || 0
        } else {
          this.$message.error(res.msg || 'Failed to load users')
        }
      } catch (error) {
        this.$message.error('Failed to load users')
      } finally {
        this.loading = false
      }
    },

    handleSearch () {
      this.pagination.current = 1
      this.loadUsers()
    },

    async loadRoles () {
      try {
        const res = await getRoles()
        if (res.code === 1) {
          this.roles = res.data.roles || []
        }
      } catch (error) {
        console.error('Failed to load roles:', error)
      }
    },

    handleTableChange (pagination) {
      this.pagination.current = pagination.current
      this.pagination.pageSize = pagination.pageSize
      this.loadUsers()
    },

    showCreateModal () {
      this.isEdit = false
      this.editingUser = null
      this.modalVisible = true
      this.$nextTick(() => {
        this.form.resetFields()
      })
    },

    showEditModal (record) {
      this.isEdit = true
      this.editingUser = record
      this.modalVisible = true
      this.$nextTick(() => {
        this.form.setFieldsValue({
          username: record.username,
          nickname: record.nickname,
          email: record.email,
          role: record.role,
          status: record.status
        })
      })
    },

    handleModalCancel () {
      this.modalVisible = false
      this.form.resetFields()
    },

    handleModalOk () {
      this.form.validateFields(async (err, values) => {
        if (err) return

        this.modalLoading = true
        try {
          let res
          if (this.isEdit) {
            res = await updateUser(this.editingUser.id, {
              nickname: values.nickname,
              email: values.email,
              role: values.role,
              status: values.status
            })
          } else {
            res = await createUser(values)
          }

          if (res.code === 1) {
            this.$message.success(res.msg || 'Success')
            this.modalVisible = false
            this.form.resetFields()
            this.loadUsers()
          } else {
            this.$message.error(res.msg || 'Operation failed')
          }
        } catch (error) {
          this.$message.error('Operation failed')
        } finally {
          this.modalLoading = false
        }
      })
    },

    async handleDelete (id) {
      try {
        const res = await deleteUser(id)
        if (res.code === 1) {
          this.$message.success(res.msg || 'User deleted')
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Delete failed')
        }
      } catch (error) {
        this.$message.error('Delete failed')
      }
    },

    showResetPasswordModal (record) {
      this.resetPasswordUserId = record.id
      this.resetPasswordVisible = true
      this.$nextTick(() => {
        this.resetPasswordForm.resetFields()
      })
    },

    handleResetPassword () {
      this.resetPasswordForm.validateFields(async (err, values) => {
        if (err) return

        this.resetPasswordLoading = true
        try {
          const res = await resetUserPassword({
            user_id: this.resetPasswordUserId,
            new_password: values.new_password
          })
          if (res.code === 1) {
            this.$message.success(res.msg || 'Password reset successfully')
            this.resetPasswordVisible = false
            this.resetPasswordForm.resetFields()
          } else {
            this.$message.error(res.msg || 'Reset failed')
          }
        } catch (error) {
          this.$message.error('Reset failed')
        } finally {
          this.resetPasswordLoading = false
        }
      })
    },

    getRoleColor (role) {
      const colors = {
        admin: 'red',
        manager: 'orange',
        user: 'blue',
        viewer: 'default'
      }
      return colors[role] || 'default'
    },

    getRoleLabel (role) {
      const labels = {
        admin: this.$t('userManage.roleAdmin') || 'Admin',
        manager: this.$t('userManage.roleManager') || 'Manager',
        user: this.$t('userManage.roleUser') || 'User',
        viewer: this.$t('userManage.roleViewer') || 'Viewer'
      }
      return labels[role] || role
    },

    formatTime (timestamp) {
      if (!timestamp) return ''
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp)
      return date.toLocaleString()
    },

    formatCredits (credits) {
      if (!credits && credits !== 0) return '0'
      return Number(credits).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatDate (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString()
    },

    isVipActive (expiresAt) {
      if (!expiresAt) return false
      return new Date(expiresAt) > new Date()
    },

    // Credits Modal
    showCreditsModal (record) {
      this.creditsEditingUser = record
      this.newCredits = parseFloat(record.credits) || 0
      this.creditsRemark = ''
      this.creditsModalVisible = true
    },

    async handleSetCredits () {
      if (this.newCredits < 0) {
        this.$message.error(this.$t('userManage.creditsNonNegative') || 'Credits cannot be negative')
        return
      }

      this.creditsLoading = true
      try {
        const res = await setUserCredits({
          user_id: this.creditsEditingUser.id,
          credits: this.newCredits,
          remark: this.creditsRemark
        })
        if (res.code === 1) {
          this.$message.success(res.msg || 'Credits updated successfully')
          this.creditsModalVisible = false
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Update failed')
        }
      } catch (error) {
        this.$message.error('Update failed')
      } finally {
        this.creditsLoading = false
      }
    },

    // VIP Modal
    showVipModal (record) {
      this.vipEditingUser = record
      this.vipDays = 30
      this.vipCustomDate = null
      this.vipRemark = ''
      this.vipModalVisible = true
    },

    async handleSetVip () {
      const data = {
        user_id: this.vipEditingUser.id,
        remark: this.vipRemark
      }

      if (this.vipDays === -1) {
        if (!this.vipCustomDate) {
          this.$message.error(this.$t('userManage.selectDate') || 'Please select a date')
          return
        }
        data.vip_expires_at = this.vipCustomDate.toISOString()
      } else {
        data.vip_days = this.vipDays
      }

      this.vipLoading = true
      try {
        const res = await setUserVip(data)
        if (res.code === 1) {
          this.$message.success(res.msg || 'VIP status updated successfully')
          this.vipModalVisible = false
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Update failed')
        }
      } catch (error) {
        this.$message.error('Update failed')
      } finally {
        this.vipLoading = false
      }
    },

    // ==================== Order List ====================
    async loadOrders () {
      this.orderLoading = true
      try {
        const res = await getAdminOrders({
          page: this.orderPagination.current,
          page_size: this.orderPagination.pageSize,
          status: this.orderStatusFilter === 'all' ? '' : this.orderStatusFilter,
          search: this.orderSearchKeyword || ''
        })
        if (res.code === 1) {
          this.orders = res.data.items || []
          this.orderPagination.total = res.data.total || 0
          this.orderSummary = res.data.summary || {}
          this.ordersLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load orders')
        }
      } catch (error) {
        console.error('Failed to load orders:', error)
        this.$message.error('Failed to load orders')
      } finally {
        this.orderLoading = false
      }
    },

    handleOrderSearch () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderFilterChange () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderTableChange (pagination) {
      this.orderPagination.current = pagination.current
      this.orderPagination.pageSize = pagination.pageSize
      this.loadOrders()
    },

    getOrderStatusColor (status) {
      const colors = {
        paid: 'green',
        confirmed: 'green',
        pending: 'orange',
        expired: 'grey', // 改为灰色，确保文字可见
        cancelled: 'default',
        failed: 'red'
      }
      return colors[status] || 'default'
    },

    getOrderStatusLabel (status) {
      const labels = {
        paid: this.$t('adminOrders.statusPaid') || 'Paid',
        confirmed: this.$t('adminOrders.statusConfirmed') || 'Confirmed',
        pending: this.$t('adminOrders.statusPending') || 'Pending',
        expired: this.$t('adminOrders.statusExpired') || 'Expired',
        cancelled: this.$t('adminOrders.statusCancelled') || 'Cancelled',
        failed: this.$t('adminOrders.statusFailed') || 'Failed'
      }
      return labels[status] || status
    },

    // ==================== AI Analysis Stats ====================
    async loadAiStats () {
      this.aiStatsLoading = true
      try {
        const res = await getAdminAiStats({
          page: this.aiStatsPagination.current,
          page_size: this.aiStatsPagination.pageSize,
          search: this.aiStatsSearchKeyword || ''
        })
        if (res.code === 1) {
          this.aiUserStats = res.data.user_stats || []
          this.aiRecentRecords = res.data.recent || []
          this.aiStatsPagination.total = res.data.user_total || 0
          this.aiStatsSummary = res.data.summary || {}
          this.aiStatsLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load AI stats')
        }
      } catch (error) {
        console.error('Failed to load AI stats:', error)
        this.$message.error('Failed to load AI stats')
      } finally {
        this.aiStatsLoading = false
      }
    },

    handleAiStatsSearch () {
      this.aiStatsPagination.current = 1
      this.loadAiStats()
    },

    handleAiStatsTableChange (pagination) {
      this.aiStatsPagination.current = pagination.current
      this.aiStatsPagination.pageSize = pagination.pageSize
      this.loadAiStats()
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.user-manage-page {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .page-header {
    margin-bottom: 24px;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1e3a5f;
      display: flex;
      align-items: center;
      gap: 12px;

      .anticon {
        font-size: 28px;
        color: @primary-color;
      }
    }

    .page-desc {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
  }

  .manage-tabs {
    /deep/ .ant-tabs-bar {
      margin-bottom: 20px;
    }
  }

  // Summary Cards
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;

    .summary-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .summary-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .anticon {
          font-size: 22px;
          color: #fff;
        }
      }

      .summary-info {
        flex: 1;
        min-width: 0;

        .summary-value {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;

          .roi-badge {
            font-size: 13px;
            font-weight: 600;
            margin-left: 6px;
            padding: 1px 6px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.04);
          }
        }

        .summary-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .summary-label {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 2px;
        }
      }
    }
  }

  .toolbar {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .toolbar-left {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
  }

  .toolbar-search {
    width: 280px;
    max-width: 100%;
  }

  .toolbar-select {
    width: 140px;
    max-width: 100%;
  }

  .section-card-title {
    margin-bottom: 12px;
    color: #1e3a5f;
    font-weight: 600;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    line-height: 1.4;
  }

  .section-card-title-icon {
    flex-shrink: 0;
  }

  .user-table-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    min-width: 0;
    overflow: hidden;

    /deep/ .ant-card-body {
      padding: 20px 24px;
    }

    .text-muted {
      color: #94a3b8;
    }
  }

  // PnL colors
  .text-profit {
    color: #52c41a;
    font-weight: 600;
  }

  .text-loss {
    color: #ff4d4f;
    font-weight: 600;
  }

  .pnl-value {
    font-size: 14px;
  }

  .roi-text {
    font-size: 12px;
    margin-left: 4px;
  }

  .pnl-detail {
    font-size: 11px;
    margin-top: 2px;
  }

  .symbol-text {
    font-weight: 500;
  }

  .symbol-count {
    font-size: 11px;
    margin-top: 2px;
  }

  // Status cell
  .status-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;

      &.dot-running {
        background: #52c41a;
        box-shadow: 0 0 6px rgba(82, 196, 26, 0.5);
        animation: pulse-green 2s infinite;
      }

      &.dot-stopped {
        background: #d9d9d9;
      }
    }

    .status-running {
      color: #52c41a;
      font-weight: 500;
      font-size: 13px;
    }

    .status-stopped {
      color: #999;
      font-size: 13px;
    }
  }

  @keyframes pulse-green {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  // User cell
  .user-cell {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    cursor: default;

    .user-name {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 80px;
    }
  }

  .indicator-name {
    color: #722ed1;
    font-size: 12px;
  }

  .exchange-name {
    font-size: 12px;
    text-transform: capitalize;
  }

  // Order address & hash styles
  .address-text,
  .hash-text {
    font-family: 'Roboto Mono', 'Courier New', monospace;
    font-size: 12px;
    color: #1890ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  // Order status tag styles - ensure expired status is visible
  /deep/ .ant-tag {
    &.ant-tag-grey {
      background-color: #f5f5f5;
      border-color: #d9d9d9;
      color: #595959;
    }
  }

  // Dark theme
  &.theme-dark {
    background: linear-gradient(180deg, #141414 0%, #1c1c1c 100%);

    .page-header {
      .page-title {
        color: #e0e6ed;
      }
      .page-desc {
        color: #8b949e;
      }
    }

    .manage-tabs {
      /deep/ .ant-tabs-bar {
        border-bottom-color: #2a2a2a;
      }
      /deep/ .ant-tabs-tab {
        color: #8b949e;
        &:hover {
          color: #c9d1d9;
        }
      }
      /deep/ .ant-tabs-tab-active {
        color: @primary-color;
      }
    }

    .summary-cards .summary-card {
      background: #1c1c1c;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

      .summary-info {
        .summary-value {
          color: #e0e6ed;

          .roi-badge {
            background: rgba(255, 255, 255, 0.08);
          }
        }
        .summary-sub {
          color: #8b949e;
        }
        .summary-label {
          color: #6e7681;
        }
      }
    }

    .user-table-card {
      background: #1c1c1c;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      /deep/ .ant-card-body {
        background: #1c1c1c;
      }

      /deep/ .ant-table {
        background: #1c1c1c;
        color: #c9d1d9;

        .ant-table-thead > tr > th {
          background: #252525;
          color: #e0e6ed;
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr > td {
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr:hover > td {
          background: #252525;
        }

        .ant-table-fixed-left .ant-table-thead > tr > th,
        .ant-table-fixed-right .ant-table-thead > tr > th {
          background: #252525 !important;
        }

        .ant-table-fixed-left .ant-table-tbody > tr > td,
        .ant-table-fixed-right .ant-table-tbody > tr > td {
          background: #1c1c1c;
        }

        .ant-table-fixed-left .ant-table-tbody > tr:hover > td,
        .ant-table-fixed-right .ant-table-tbody > tr:hover > td {
          background: #252525;
        }
      }

      .text-muted {
        color: #6e7681;
      }

      h4 {
        color: #e0e6ed !important;
      }
    }

    .section-card-title {
      color: #e0e6ed;
    }
  }

  // Credits value style
  .credits-value {
    font-weight: 600;
    color: #722ed1;
  }

  // Current info styles
  .current-credits-info,
  .current-vip-info {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #f5f5f5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;

    .label {
      color: #666;
    }

    .value {
      font-weight: 600;
      color: #1890ff;
      font-size: 18px;

      &.active {
        color: #52c41a;
      }

      &.expired {
        color: #999;
      }
    }
  }

  // —— 响应式 ——
  @media (max-width: 1200px) {
    .summary-cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    padding: 16px 12px;
    min-height: calc(100vh - 100px);

    .page-header {
      margin-bottom: 16px;

      .page-title {
        font-size: 20px;

        .anticon {
          font-size: 22px;
        }
      }

      .page-desc {
        font-size: 13px;
      }
    }

    .summary-cards {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 16px;

      .summary-card {
        padding: 14px 16px;
        gap: 12px;

        .summary-icon {
          width: 44px;
          height: 44px;

          .anticon {
            font-size: 20px;
          }
        }

        .summary-info .summary-value {
          font-size: 18px;
        }
      }
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
      }
    }

    .toolbar-search,
    .toolbar-select {
      width: 100% !important;
    }

    .manage-tabs {
      /deep/ .ant-tabs-bar {
        margin-bottom: 12px;
      }

      /deep/ .ant-tabs-nav-container {
        overflow-x: auto;
        overflow-y: hidden;
      }

      /deep/ .ant-tabs-nav-wrap {
        margin-bottom: 0;
      }

      /deep/ .ant-tabs-tab {
        padding: 10px 12px;
        margin-right: 4px;
        font-size: 13px;
        white-space: nowrap;
      }
    }

    .user-table-card /deep/ .ant-card-body {
      padding: 12px 10px;
    }

    /deep/ .ant-table {
      font-size: 12px;
    }

    /deep/ .ant-table-thead > tr > th,
    /deep/ .ant-table-tbody > tr > td {
      padding: 8px 6px;
    }

    /deep/ .ant-pagination {
      margin: 12px 0 0;
    }
  }

  @media (max-width: 480px) {
    padding: 12px 8px;

    .page-header .page-title {
      font-size: 18px;
    }

    .toolbar .toolbar-left {
      flex-direction: column;

      .ant-btn {
        width: 100%;
      }
    }

    .summary-cards .summary-card .summary-sub {
      white-space: normal;
      line-height: 1.35;
    }

    /deep/ .ant-pagination-options {
      display: none;
    }
  }
}
</style>

<style lang="less">
/* Modal 挂载在 body 上，需非 scoped */
.user-manage-modal-dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    background: #1c1c1c;
  }

  .ant-modal-header {
    border-bottom-color: #2a2a2a;
  }

  .ant-modal-title {
    color: #e0e6ed;
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);
  }

  .ant-modal-footer {
    border-top-color: #2a2a2a;
  }

  .ant-form-item-label > label,
  .current-credits-info .label,
  .current-vip-info .label {
    color: #c9d1d9;
  }

  .ant-input,
  .ant-input-password,
  .ant-input-affix-wrapper,
  .ant-select-selection,
  .ant-calendar-picker-input {
    background: #141414 !important;
    border-color: #303030 !important;
    color: #e0e6ed !important;
  }

  .ant-input::placeholder,
  .ant-input-password input::placeholder {
    color: #6e7681;
  }

  .ant-input-prefix,
  .ant-input-affix-wrapper .ant-input-prefix,
  .ant-input-password-icon,
  .ant-input-password .anticon,
  .ant-calendar-picker-icon,
  .anticon {
    color: rgba(255, 255, 255, 0.55);
  }

  .current-credits-info,
  .current-vip-info {
    background: #141414;
  }
}

@media (max-width: 576px) {
  .user-manage-modal .ant-modal {
    max-width: calc(100vw - 16px) !important;
    margin: 8px auto;
    padding-bottom: 0;
    top: 8px;
  }

  .user-manage-modal .ant-modal-content {
    border-radius: 10px;
  }

  .user-manage-modal .ant-modal-body {
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    padding: 16px;
  }

  .user-manage-modal .ant-modal-header {
    padding: 12px 16px;
  }

  .user-manage-modal .ant-modal-footer {
    padding: 10px 16px;
  }
}
</style>
