import request from '@/utils/request'

/** Place a quick trade order */
export function placeQuickOrder (data) {
  return request({
    url: '/api/quick-trade/place-order',
    method: 'post',
    data
  })
}

/** Get available balance from exchange */
export function getQuickTradeBalance (params) {
  return request({
    url: '/api/quick-trade/balance',
    method: 'get',
    params
  })
}

/** Get current position for a symbol */
export function getQuickTradePosition (params) {
  return request({
    url: '/api/quick-trade/position',
    method: 'get',
    params
  })
}

/** Get quick trade history */
export function getQuickTradeHistory (params) {
  return request({
    url: '/api/quick-trade/history',
    method: 'get',
    params
  })
}

/** Close an existing position */
export function closeQuickTradePosition (data) {
  return request({
    url: '/api/quick-trade/close-position',
    method: 'post',
    data
  })
}
