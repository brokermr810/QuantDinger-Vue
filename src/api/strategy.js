import request from '@/utils/request'

const api = {
  // Local Python backend
  strategies: '/api/strategies',
  strategyDetail: '/api/strategies/detail',
  createStrategy: '/api/strategies/create',
  batchCreateStrategies: '/api/strategies/batch-create',
  updateStrategy: '/api/strategies/update',
  stopStrategy: '/api/strategies/stop',
  startStrategy: '/api/strategies/start',
  deleteStrategy: '/api/strategies/delete',
  batchStartStrategies: '/api/strategies/batch-start',
  batchStopStrategies: '/api/strategies/batch-stop',
  batchDeleteStrategies: '/api/strategies/batch-delete',
  testConnection: '/api/strategies/test-connection',
  trades: '/api/strategies/trades',
  positions: '/api/strategies/positions',
  equityCurve: '/api/strategies/equityCurve',
  notifications: '/api/strategies/notifications',
  unreadNotificationCount: '/api/strategies/notifications/unread-count',
  verifyCode: '/api/strategies/verify-code',
  aiGenerate: '/api/strategies/ai-generate',
  performance: '/api/strategies/performance',
  logs: '/api/strategies/logs',
  backtest: '/api/strategies/backtest',
  backtestHistory: '/api/strategies/backtest/history',
  backtestGet: '/api/strategies/backtest/get'
}

/**
 * 获取策略列表
 * @param {Object} params - 查询参数
 * @param {number} params.user_id - 用户ID（可选）
 */
export function getStrategyList (params = {}) {
  return request({
    url: api.strategies,
    method: 'get',
    params
  })
}

/**
 * 获取策略详情
 * @param {number} id - 策略ID
 */
export function getStrategyDetail (id) {
  return request({
    url: api.strategyDetail,
    method: 'get',
    params: { id }
  })
}

/**
 * 创建策略
 * @param {Object} data - 策略数据
 * @param {number} data.user_id - 用户ID
 * @param {string} data.strategy_name - 策略名称
 * @param {string} data.strategy_type - 策略类型
 * @param {Object} data.llm_model_config - LLM模型配置
 * @param {Object} data.exchange_config - 交易所配置
 * @param {Object} data.trading_config - 交易配置
 */
export function createStrategy (data) {
  return request({
    url: api.createStrategy,
    method: 'post',
    data
  })
}

/**
 * 批量创建策略（多币种）
 * @param {Object} data - 策略数据
 * @param {string} data.strategy_name - 策略基础名称
 * @param {Array} data.symbols - 币种数组，如 ["Crypto:BTC/USDT", "Crypto:ETH/USDT"]
 */
export function batchCreateStrategies (data) {
  return request({
    url: api.batchCreateStrategies,
    method: 'post',
    data
  })
}

/**
 * 更新策略
 * @param {number} id - 策略ID
 * @param {Object} data - 策略数据
 * @param {string} data.strategy_name - 策略名称（可选）
 * @param {Object} data.indicator_config - 技术指标配置（可选）
 * @param {Object} data.exchange_config - 交易所配置（可选）
 * @param {Object} data.trading_config - 交易配置（可选）
 */
export function updateStrategy (id, data) {
  return request({
    url: api.updateStrategy,
    method: 'put',
    params: { id },
    data
  })
}

/**
 * 停止策略
 * @param {number} id - 策略ID
 */
export function stopStrategy (id) {
  return request({
    url: api.stopStrategy,
    method: 'post',
    params: { id }
  })
}

/**
 * 启动策略
 * @param {number} id - 策略ID
 */
export function startStrategy (id) {
  return request({
    url: api.startStrategy,
    method: 'post',
    params: { id }
  })
}

/**
 * 删除策略
 * @param {number} id - 策略ID
 */
export function deleteStrategy (id) {
  return request({
    url: api.deleteStrategy,
    method: 'delete',
    params: { id }
  })
}

/**
 * 批量启动策略
 * @param {Object} data
 * @param {Array} data.strategy_ids - 策略ID数组
 * @param {string} data.strategy_group_id - 策略组ID（可选，与strategy_ids二选一）
 */
export function batchStartStrategies (data) {
  return request({
    url: api.batchStartStrategies,
    method: 'post',
    data
  })
}

/**
 * 批量停止策略
 * @param {Object} data
 * @param {Array} data.strategy_ids - 策略ID数组
 * @param {string} data.strategy_group_id - 策略组ID（可选，与strategy_ids二选一）
 */
export function batchStopStrategies (data) {
  return request({
    url: api.batchStopStrategies,
    method: 'post',
    data
  })
}

/**
 * 批量删除策略
 * @param {Object} data
 * @param {Array} data.strategy_ids - 策略ID数组
 * @param {string} data.strategy_group_id - 策略组ID（可选，与strategy_ids二选一）
 */
export function batchDeleteStrategies (data) {
  return request({
    url: api.batchDeleteStrategies,
    method: 'delete',
    data
  })
}

/**
 * 测试交易所连接
 * @param {Object} exchangeConfig - 交易所配置
 */
export function testExchangeConnection (exchangeConfig) {
  return request({
    url: api.testConnection,
    method: 'post',
    data: { exchange_config: exchangeConfig }
  })
}

/**
 * 获取策略交易记录
 * @param {number} id - 策略ID
 */
export function getStrategyTrades (id) {
  return request({
    url: api.trades,
    method: 'get',
    params: { id }
  })
}

/**
 * 获取策略持仓记录
 * @param {number} id - 策略ID
 */
export function getStrategyPositions (id) {
  return request({
    url: api.positions,
    method: 'get',
    params: { id }
  })
}

/**
 * 获取策略净值曲线
 * @param {number} id - 策略ID
 */
export function getStrategyEquityCurve (id) {
  return request({
    url: api.equityCurve,
    method: 'get',
    params: { id }
  })
}

/**
 * Strategy signal notifications (browser channel persistence).
 * @param {Object} params
 * @param {number} params.id - strategy id (optional)
 * @param {number} params.limit - max items (optional)
 * @param {number} params.since_id - return items with id > since_id (optional)
 */
export function getStrategyNotifications (params = {}) {
  return request({
    url: api.notifications,
    method: 'get',
    params
  })
}

/**
 * Unread notification count for header badge.
 */
export function getUnreadNotificationCount () {
  return request({
    url: api.unreadNotificationCount,
    method: 'get'
  })
}

/**
 * Verify strategy script code
 */
export function verifyStrategyCode (data) {
  return request({
    url: api.verifyCode,
    method: 'post',
    data
  })
}

/**
 * AI generate strategy code
 */
export function aiGenerateStrategy (data) {
  return request({
    url: api.aiGenerate,
    method: 'post',
    data
  })
}

/**
 * Get strategy performance metrics
 */
export function getStrategyPerformance (id) {
  return request({
    url: api.performance,
    method: 'get',
    params: { id }
  })
}

/**
 * Get strategy running logs
 */
export function getStrategyLogs (id, params = {}) {
  return request({
    url: api.logs,
    method: 'get',
    params: { id, ...params }
  })
}

export function runStrategyBacktest (data) {
  const payload = { ...(data || {}) }
  const timeout = payload.timeout
  delete payload.timeout
  return request({
    url: api.backtest,
    method: 'post',
    data: payload,
    timeout
  })
}

export function getStrategyBacktestHistory (params = {}) {
  return request({
    url: api.backtestHistory,
    method: 'get',
    params
  })
}

export function getStrategyBacktestRun (runId) {
  return request({
    url: api.backtestGet,
    method: 'get',
    params: { runId }
  })
}
