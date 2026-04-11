/**
 * Exchange WebSocket K-line stream client.
 *
 * Supports multiple exchanges: Binance, OKX, Bitget, Bybit, Gate, Coinbase.
 * Falls back to Binance if the configured exchange fails to connect.
 */

// ── Exchange WebSocket configs ─────────────────────────────

const EXCHANGE_WS = {
  binance: {
    base: 'wss://stream.binance.com:9443/ws',
    buildUrl (symbol, interval) {
      const s = symbol.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      return `${this.base}/${s}@kline_${interval}`
    },
    parseBar (data) {
      if (data.e !== 'kline' || !data.k) return null
      const k = data.k
      return {
        timestamp: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        isClosed: !!k.x
      }
    },
    ping (ws) {
      try { ws.send(JSON.stringify({ pong: Date.now() })) } catch (_) {}
    }
  },

  okx: {
    base: 'wss://ws.okx.com:8443/ws/v5/business',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval) {
      const instId = _toOkxInstId(symbol)
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'candle' + interval, instId }]
      }))
    },
    parseBar (data) {
      if (!data.data || !data.arg || !data.arg.channel) return null
      if (!data.arg.channel.startsWith('candle')) return null
      const c = data.data[0]
      if (!c) return null
      return {
        timestamp: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        isClosed: !!c[8] || data.data.length > 0
      }
    },
    ping (ws) {
      try { ws.send('ping') } catch (_) {}
    }
  },

  bitget: {
    base: 'wss://ws.bitget.com/v2/ws/public',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval) {
      const instId = _toBitgetInstId(symbol)
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ instType: 'SPOT', channel: 'candle' + interval, instId }]
      }))
    },
    parseBar (data) {
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) return null
      if (!data.arg || !String(data.arg.channel || '').startsWith('candle')) return null
      const c = data.data[0]
      if (!Array.isArray(c)) return null
      return {
        timestamp: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        isClosed: true
      }
    },
    ping (ws) {
      try { ws.send('ping') } catch (_) {}
    }
  },

  bybit: {
    base: 'wss://stream.bybit.com/v5/public/spot',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval) {
      const s = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [`kline.${interval}.${s}`]
      }))
    },
    parseBar (data) {
      if (!data.data || data.topic === undefined) return null
      if (!String(data.topic).startsWith('kline.')) return null
      const c = data.data[0]
      if (!c) return null
      return {
        timestamp: parseInt(c.start),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
        isClosed: !!c.confirm
      }
    },
    ping (ws) {
      try { ws.send(JSON.stringify({ op: 'ping' })) } catch (_) {}
    }
  },

  gate: {
    base: 'wss://api.gateio.ws/ws/v4/',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval) {
      const s = symbol.replace('/', '_').toUpperCase()
      ws.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel: 'spot.candlesticks',
        event: 'subscribe',
        payload: [interval, s]
      }))
    },
    parseBar (data) {
      if (data.channel !== 'spot.candlesticks' || data.event !== 'update') return null
      const c = data.result
      if (!c) return null
      return {
        timestamp: parseInt(c.t) * 1000,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
        isClosed: !!c.n
      }
    },
    ping (ws) {
      try {
        ws.send(JSON.stringify({
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.ping'
        }))
      } catch (_) {}
    }
  }
}

// ── Timeframe mapping per exchange ──────────────────────────

const BINANCE_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w', '1M': '1M' }
const OKX_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1H', '4H': '4H', '1D': '1D', '1W': '1W', '1M': '1M' }
const BITGET_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w', '1M': '1M' }
const BYBIT_TF = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '4H': '240', '1D': 'D', '1W': 'W', '1M': 'M' }
const GATE_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '7d', '1M': '30d' }

function getInterval (exchange, timeframe) {
  const map = { binance: BINANCE_TF, okx: OKX_TF, bitget: BITGET_TF, bybit: BYBIT_TF, gate: GATE_TF }
  return (map[exchange] || BINANCE_TF)[timeframe] || '1h'
}

// ── Symbol formatters ───────────────────────────────────────

function _toOkxInstId (symbol) {
  const parts = symbol.split('/')
  if (parts.length === 2) return `${parts[0].toUpperCase()}-${parts[1].toUpperCase()}`
  return symbol.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()
}

function _toBitgetInstId (symbol) {
  const parts = symbol.split('/')
  if (parts.length === 2) return `${parts[0].toUpperCase()}${parts[1].toUpperCase()}`
  return symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

// ── Resolve exchange alias ──────────────────────────────────

function resolveExchangeId (id) {
  const lower = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const aliases = {
    okx: 'okx',
    okex: 'okx',
    binance: 'binance',
    bitget: 'bitget',
    bybit: 'bybit',
    gate: 'gate',
    gateio: 'gate',
    coinbase: 'binance',
    htx: 'binance',
    huobi: 'binance',
    kraken: 'binance',
    kucoin: 'binance'
  }
  return aliases[lower] || 'binance'
}

const FALLBACK_EXCHANGE = 'binance'

// ── Main class ──────────────────────────────────────────────

export default class ExchangeKlineWs {
  constructor () {
    this._ws = null
    this._url = ''
    this._exchangeId = 'binance'
    this._exchangeConf = EXCHANGE_WS.binance
    this._onTick = null
    this._onNewBar = null
    this._onError = null
    this._onReconnecting = null
    this._onReconnected = null
    this._reconnectAttempts = 0
    this._maxReconnectAttempts = 20
    this._reconnectTimer = null
    this._pingTimer = null
    this._closed = false
    this._symbol = ''
    this._timeframe = ''
    this._everConnected = false
    this._fallbackUsed = false
    this._connectTimeout = null
    this._dataTimeout = null
    this._openGen = 0
    this._gotData = false
  }

  /**
   * @param {string} symbol  e.g. "BTC/USDT"
   * @param {string} timeframe e.g. "1m", "1H"
   * @param {Object} callbacks
   * @param {string} [exchangeId] preferred exchange from settings
   */
  connect (symbol, timeframe, callbacks, exchangeId) {
    this.disconnect()
    this._closed = false
    this._everConnected = false
    this._fallbackUsed = false
    this._symbol = symbol
    this._timeframe = timeframe
    this._onTick = callbacks.onTick
    this._onNewBar = callbacks.onNewBar
    this._onError = callbacks.onError || null
    this._onReconnecting = callbacks.onReconnecting || null
    this._onReconnected = callbacks.onReconnected || null
    this._reconnectAttempts = 0

    this._exchangeId = resolveExchangeId(exchangeId)
    this._exchangeConf = EXCHANGE_WS[this._exchangeId]
    this._buildUrl()
    this._open()
  }

  disconnect () {
    this._closed = true
    this._openGen++
    this._clearTimers()
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onmessage = null
      this._ws.onerror = null
      this._ws.onopen = null
      try { this._ws.close() } catch (_) {}
      this._ws = null
    }
  }

  isConnected () {
    return this._ws !== null && this._ws.readyState === WebSocket.OPEN
  }

  currentExchange () {
    return this._exchangeId
  }

  // ── internal ──────────────────────────────

  _buildUrl () {
    const interval = getInterval(this._exchangeId, this._timeframe)
    this._url = this._exchangeConf.buildUrl(this._symbol, interval)
  }

  _open () {
    if (this._closed) return
    const myGen = ++this._openGen
    try {
      this._ws = new WebSocket(this._url)
    } catch (e) {
      console.warn(`[ExchangeWs] ${this._exchangeId} WebSocket constructor failed:`, e.message)
      this._tryFallback()
      return
    }

    this._connectTimeout = setTimeout(() => {
      if (myGen !== this._openGen) return
      if (this._ws && this._ws.readyState !== WebSocket.OPEN) {
        console.warn(`[ExchangeWs] ${this._exchangeId} connect timeout (8s), falling back`)
        this._ws.onclose = null
        this._ws.onerror = null
        try { this._ws.close() } catch (_) {}
        this._ws = null
        this._tryFallback()
      }
    }, 8000)

    this._ws.onopen = () => {
      if (myGen !== this._openGen) return
      if (this._connectTimeout) {
        clearTimeout(this._connectTimeout)
        this._connectTimeout = null
      }
      const wasReconnect = this._everConnected
      this._everConnected = true
      this._reconnectAttempts = 0
      this._gotData = false
      this._startPing()

      if (this._exchangeConf.subscribe) {
        const interval = getInterval(this._exchangeId, this._timeframe)
        try {
          this._exchangeConf.subscribe(this._ws, this._symbol, interval)
        } catch (e) {
          console.warn(`[ExchangeWs] ${this._exchangeId} subscribe error:`, e)
        }
      }

      // For non-Binance exchanges: if no data arrives within 12s after open,
      // the subscription likely failed silently — fall back.
      if (this._exchangeId !== FALLBACK_EXCHANGE && !this._fallbackUsed) {
        this._dataTimeout = setTimeout(() => {
          if (myGen !== this._openGen) return
          if (!this._gotData && !this._closed) {
            console.warn(`[ExchangeWs] ${this._exchangeId} connected but no data received, falling back`)
            this._ws.onclose = null
            try { this._ws.close() } catch (_) {}
            this._ws = null
            this._tryFallback()
          }
        }, 12000)
      }

      if (wasReconnect && this._onReconnected) {
        this._onReconnected()
      }
    }

    this._ws.onmessage = (evt) => {
      if (myGen !== this._openGen) return
      this._handleMessage(evt)
    }

    this._ws.onerror = () => {}

    this._ws.onclose = () => {
      if (myGen !== this._openGen) return
      if (this._connectTimeout) {
        clearTimeout(this._connectTimeout)
        this._connectTimeout = null
      }
      this._clearPing()
      if (!this._closed) {
        if (!this._everConnected && !this._fallbackUsed) {
          this._tryFallback()
        } else {
          if (this._everConnected && this._onReconnecting) {
            this._onReconnecting()
          }
          this._scheduleReconnect()
        }
      }
    }
  }

  _tryFallback () {
    if (this._closed || this._fallbackUsed) {
      if (this._onError) this._onError()
      return
    }
    if (this._exchangeId === FALLBACK_EXCHANGE) {
      if (this._onError) this._onError()
      return
    }
    console.warn(`[ExchangeWs] ${this._exchangeId} failed, falling back to ${FALLBACK_EXCHANGE}`)
    this._fallbackUsed = true
    this._everConnected = false
    this._exchangeId = FALLBACK_EXCHANGE
    this._exchangeConf = EXCHANGE_WS[FALLBACK_EXCHANGE]
    this._buildUrl()
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onmessage = null
      this._ws.onerror = null
      this._ws.onopen = null
      try { this._ws.close() } catch (_) {}
      this._ws = null
    }
    this._open()
  }

  _handleMessage (evt) {
    if (typeof evt.data === 'string' && (evt.data === 'pong' || evt.data === '')) return

    let data
    try {
      data = JSON.parse(evt.data)
    } catch (_) {
      return
    }

    if (data.event === 'subscribe' || data.op === 'subscribe' || data.event === 'pong' || data.ret_msg === 'pong') return

    const parsed = this._exchangeConf.parseBar(data)
    if (!parsed) return

    if (!this._gotData) {
      this._gotData = true
      if (this._dataTimeout) {
        clearTimeout(this._dataTimeout)
        this._dataTimeout = null
      }
    }

    const bar = {
      timestamp: parsed.timestamp,
      open: parsed.open,
      high: parsed.high,
      low: parsed.low,
      close: parsed.close,
      volume: parsed.volume
    }

    if (this._onTick) {
      this._onTick(bar)
    }

    if (parsed.isClosed && this._onNewBar) {
      this._onNewBar(bar)
    }
  }

  _scheduleReconnect () {
    if (this._closed) return
    this._reconnectAttempts++
    if (this._reconnectAttempts > this._maxReconnectAttempts) {
      if (this._onError) this._onError()
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts - 1), 30000)
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this._open()
    }, delay)
  }

  _startPing () {
    this._clearPing()
    this._pingTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._exchangeConf.ping(this._ws)
      }
    }, 120000)
  }

  _clearPing () {
    if (this._pingTimer) {
      clearInterval(this._pingTimer)
      this._pingTimer = null
    }
  }

  _clearTimers () {
    this._clearPing()
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout)
      this._connectTimeout = null
    }
    if (this._dataTimeout) {
      clearTimeout(this._dataTimeout)
      this._dataTimeout = null
    }
  }
}

export { resolveExchangeId, EXCHANGE_WS }
