const TEMPLATE_DEFINITIONS = [
  {
    key: 'trendFollowing',
    icon: '📈',
    code: `"""
Trend Following Strategy
Uses EMA crossover with dynamic stop-loss / take-profit.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 12)
    ctx.slow_period = ctx.param('slow_period', 26)
    ctx.position_pct = ctx.param('position_pct', 0.95)
    ctx.stop_pct = ctx.param('stop_pct', 0.03)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.08)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return

    closes = [b['close'] for b in bars]
    fast_ema = _ema(closes, ctx.fast_period)
    slow_ema = _ema(closes, ctx.slow_period)
    price = bar['close']

    if fast_ema > slow_ema and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"BUY at {price:.2f}")

    elif fast_ema < slow_ema and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"SELL at {price:.2f}")

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        pnl_pct = (price - entry) / entry
        if pnl_pct <= -ctx.stop_pct:
            ctx.close_position()
            ctx.log(f"STOP LOSS at {price:.2f}")
        elif pnl_pct >= ctx.take_profit_pct:
            ctx.close_position()
            ctx.log(f"TAKE PROFIT at {price:.2f}")

def _ema(data, period):
    k = 2 / (period + 1)
    ema = data[0]
    for price in data[1:]:
        ema = price * k + ema * (1 - k)
    return ema
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 12, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 26, min: 5, max: 240, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.95, min: 0.05, max: 1, step: 0.01 },
      { name: 'stop_pct', type: 'percent', default: 0.03, min: 0.001, max: 0.5, step: 0.001 },
      { name: 'take_profit_pct', type: 'percent', default: 0.08, min: 0.001, max: 1, step: 0.001 }
    ]
  },
  {
    key: 'martingale',
    icon: '🔥',
    code: `"""
Martingale Strategy
Double position on each loss, with max layer control.
"""

def on_init(ctx):
    ctx.base_amount = ctx.param('base_amount', 100)
    ctx.max_layers = ctx.param('max_layers', 5)
    ctx.multiplier = ctx.param('multiplier', 2.0)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.02)
    ctx.stop_loss_pct = ctx.param('stop_loss_pct', 0.04)
    ctx.cooldown_bars = ctx.param('cooldown_bars', 1)
    ctx.current_layer = 0
    ctx.cooldown = 0

def on_bar(ctx, bar):
    if ctx.cooldown > 0:
        ctx.cooldown -= 1
        return

    price = bar['close']
    if not ctx.position:
        amount = ctx.base_amount * (ctx.multiplier ** ctx.current_layer)
        if amount <= ctx.balance:
            qty = amount / price
            ctx.buy(price, qty)
            ctx.log(f"Layer {ctx.current_layer}: BUY {qty:.4f} at {price:.2f}")
    else:
        entry = ctx.position['entry_price']
        pnl_pct = (price - entry) / entry

        if pnl_pct >= ctx.take_profit_pct:
            ctx.close_position()
            ctx.current_layer = 0
            ctx.cooldown = ctx.cooldown_bars
            ctx.log(f"TAKE PROFIT at {price:.2f}, reset layers")

        elif pnl_pct <= -ctx.stop_loss_pct:
            ctx.close_position()
            ctx.cooldown = ctx.cooldown_bars
            if ctx.current_layer < ctx.max_layers:
                ctx.current_layer += 1
                ctx.log(f"LOSS, escalate to layer {ctx.current_layer}")
            else:
                ctx.current_layer = 0
                ctx.log("Max layers reached, reset")
`,
    params: [
      { name: 'base_amount', type: 'number', default: 100, min: 10, max: 1000000, step: 10 },
      { name: 'max_layers', type: 'integer', default: 5, min: 1, max: 20, step: 1 },
      { name: 'multiplier', type: 'number', default: 2.0, min: 1, max: 5, step: 0.1 },
      { name: 'take_profit_pct', type: 'percent', default: 0.02, min: 0.001, max: 1, step: 0.001 },
      { name: 'stop_loss_pct', type: 'percent', default: 0.04, min: 0.001, max: 1, step: 0.001 },
      { name: 'cooldown_bars', type: 'integer', default: 1, min: 0, max: 500, step: 1 }
    ]
  },
  {
    key: 'grid',
    icon: '📐',
    code: `"""
Grid Trading Strategy
Places buy/sell orders at equal intervals within a price range.
"""

def on_init(ctx):
    ctx.grid_upper = ctx.param('grid_upper', 70000)
    ctx.grid_lower = ctx.param('grid_lower', 60000)
    ctx.grid_levels = ctx.param('grid_levels', 10)
    ctx.order_amount = ctx.param('order_amount', 100)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.05)
    ctx.stop_loss_pct = ctx.param('stop_loss_pct', 0.03)
    ctx.filled_grids = set()

    spacing = (ctx.grid_upper - ctx.grid_lower) / ctx.grid_levels
    ctx.grid_prices = [ctx.grid_lower + i * spacing for i in range(ctx.grid_levels + 1)]

def on_bar(ctx, bar):
    price = bar['close']
    if price < ctx.grid_lower or price > ctx.grid_upper:
        return

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        pnl_pct = (price - entry) / entry
        if pnl_pct >= ctx.take_profit_pct or pnl_pct <= -ctx.stop_loss_pct:
            ctx.close_position()
            ctx.filled_grids.clear()
            ctx.log(f"Grid risk exit at {price:.2f}, pnl={pnl_pct:.2%}")
            return

    for i, gp in enumerate(ctx.grid_prices[:-1]):
        upper_gp = ctx.grid_prices[i + 1]
        grid_id = f"grid_{i}"

        if price <= gp and grid_id not in ctx.filled_grids:
            qty = ctx.order_amount / price
            ctx.buy(price, qty)
            ctx.filled_grids.add(grid_id)
            ctx.log(f"Grid BUY at {price:.2f} (level {i})")

        elif price >= upper_gp and grid_id in ctx.filled_grids:
            qty = ctx.order_amount / price
            ctx.sell(price, qty)
            ctx.filled_grids.discard(grid_id)
            ctx.log(f"Grid SELL at {price:.2f} (level {i})")
`,
    params: [
      { name: 'grid_upper', type: 'number', default: 70000, min: 1, max: 100000000, step: 10 },
      { name: 'grid_lower', type: 'number', default: 60000, min: 1, max: 100000000, step: 10 },
      { name: 'grid_levels', type: 'integer', default: 10, min: 2, max: 200, step: 1 },
      { name: 'order_amount', type: 'number', default: 100, min: 1, max: 1000000, step: 1 },
      { name: 'take_profit_pct', type: 'percent', default: 0.05, min: 0.001, max: 1, step: 0.001 },
      { name: 'stop_loss_pct', type: 'percent', default: 0.03, min: 0.001, max: 1, step: 0.001 }
    ]
  },
  {
    key: 'dca',
    icon: '💰',
    code: `"""
DCA (Dollar Cost Averaging) Strategy
Periodic purchases with optional dip-buying.
"""

def on_init(ctx):
    ctx.buy_amount = ctx.param('buy_amount', 100)
    ctx.dip_threshold = ctx.param('dip_threshold', 0.05)
    ctx.dip_multiplier = ctx.param('dip_multiplier', 2.0)
    ctx.buy_interval = ctx.param('buy_interval', 24)
    ctx.max_orders = ctx.param('max_orders', 999)
    ctx.bar_count = 0
    ctx.order_count = 0
    ctx.last_buy_price = None

def on_bar(ctx, bar):
    ctx.bar_count += 1
    price = bar['close']

    if ctx.order_count >= ctx.max_orders:
        return

    is_dip = False
    if ctx.last_buy_price and price < ctx.last_buy_price * (1 - ctx.dip_threshold):
        is_dip = True

    if ctx.bar_count % ctx.buy_interval == 0 or is_dip:
        amount = ctx.buy_amount * (ctx.dip_multiplier if is_dip else 1.0)
        if amount <= ctx.balance:
            qty = amount / price
            ctx.buy(price, qty)
            ctx.last_buy_price = price
            ctx.order_count += 1
            tag = " (DIP BUY)" if is_dip else ""
            ctx.log(f"DCA BUY {qty:.6f} at {price:.2f}{tag}")
`,
    params: [
      { name: 'buy_amount', type: 'number', default: 100, min: 1, max: 1000000, step: 1 },
      { name: 'buy_interval', type: 'integer', default: 24, min: 1, max: 1000, step: 1 },
      { name: 'dip_threshold', type: 'percent', default: 0.05, min: 0.001, max: 1, step: 0.001 },
      { name: 'dip_multiplier', type: 'number', default: 2.0, min: 1, max: 10, step: 0.1 },
      { name: 'max_orders', type: 'integer', default: 999, min: 1, max: 9999, step: 1 }
    ]
  },
  {
    key: 'meanReversion',
    icon: '🔄',
    code: `"""
Mean Reversion Strategy
Bollinger Bands based: buy at lower band, sell at upper band.
"""

def on_init(ctx):
    ctx.period = ctx.param('period', 20)
    ctx.std_mult = ctx.param('std_mult', 2.0)
    ctx.position_pct = ctx.param('position_pct', 0.5)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.03)
    ctx.stop_loss_pct = ctx.param('stop_loss_pct', 0.02)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.period + 5)
    if len(bars) < ctx.period:
        return

    closes = [b['close'] for b in bars[-ctx.period:]]
    mean = sum(closes) / len(closes)
    std = (sum((c - mean) ** 2 for c in closes) / len(closes)) ** 0.5

    upper = mean + ctx.std_mult * std
    lower = mean - ctx.std_mult * std
    price = bar['close']

    if price <= lower and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"BUY at {price:.2f} (below lower band {lower:.2f})")

    elif price >= upper and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"SELL at {price:.2f} (above upper band {upper:.2f})")

    elif ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        pnl_pct = (price - entry) / entry
        if pnl_pct >= ctx.take_profit_pct or pnl_pct <= -ctx.stop_loss_pct:
            ctx.close_position()
            ctx.log(f"Risk exit at {price:.2f}, pnl={pnl_pct:.2%}")
`,
    params: [
      { name: 'period', type: 'integer', default: 20, min: 2, max: 300, step: 1 },
      { name: 'std_mult', type: 'number', default: 2.0, min: 0.5, max: 6, step: 0.1 },
      { name: 'position_pct', type: 'percent', default: 0.5, min: 0.05, max: 1, step: 0.01 },
      { name: 'take_profit_pct', type: 'percent', default: 0.03, min: 0.001, max: 1, step: 0.001 },
      { name: 'stop_loss_pct', type: 'percent', default: 0.02, min: 0.001, max: 1, step: 0.001 }
    ]
  },
  {
    key: 'breakout',
    icon: '⚡',
    code: `"""
Breakout Strategy
Enter when price breaks key resistance/support with volume confirmation.
"""

def on_init(ctx):
    ctx.lookback = ctx.param('lookback', 20)
    ctx.volume_mult = ctx.param('volume_mult', 1.5)
    ctx.position_pct = ctx.param('position_pct', 0.9)
    ctx.stop_pct = ctx.param('stop_pct', 0.02)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.05)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.lookback + 5)
    if len(bars) < ctx.lookback:
        return

    recent = bars[-ctx.lookback:]
    high = max(b['high'] for b in recent[:-1])
    low = min(b['low'] for b in recent[:-1])
    avg_vol = sum(b['volume'] for b in recent[:-1]) / (len(recent) - 1)
    price = bar['close']
    vol = bar['volume']

    if price > high and vol > avg_vol * ctx.volume_mult and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"BREAKOUT BUY at {price:.2f} (prev high: {high:.2f})")

    elif price < low and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"BREAK DOWN, close at {price:.2f}")

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        pnl_pct = (price - entry) / entry
        if pnl_pct <= -ctx.stop_pct:
            ctx.close_position()
            ctx.log(f"STOP LOSS at {price:.2f}")
        elif pnl_pct >= ctx.take_profit_pct:
            ctx.close_position()
            ctx.log(f"TAKE PROFIT at {price:.2f}")
`,
    params: [
      { name: 'lookback', type: 'integer', default: 20, min: 2, max: 300, step: 1 },
      { name: 'volume_mult', type: 'number', default: 1.5, min: 0.5, max: 10, step: 0.1 },
      { name: 'position_pct', type: 'percent', default: 0.9, min: 0.05, max: 1, step: 0.01 },
      { name: 'stop_pct', type: 'percent', default: 0.02, min: 0.001, max: 1, step: 0.001 },
      { name: 'take_profit_pct', type: 'percent', default: 0.05, min: 0.001, max: 1, step: 0.001 }
    ]
  },
  {
    key: 'rsiMeanReversion',
    icon: '📉',
    code: `"""
RSI mean reversion (long-focused)
Buys when RSI is oversold; exits long when RSI is overbought.
"""

def on_init(ctx):
    ctx.rsi_period = ctx.param('rsi_period', 14)
    ctx.oversold = ctx.param('oversold', 30)
    ctx.overbought = ctx.param('overbought', 70)
    ctx.position_pct = ctx.param('position_pct', 0.5)

def _rsi_simple(closes, period):
    n = len(closes)
    if n < period + 1:
        return None
    gains = 0.0
    losses = 0.0
    for i in range(n - period, n):
        diff = closes[i] - closes[i - 1]
        if diff > 0:
            gains += diff
        else:
            losses -= diff
    if losses == 0:
        return 100.0 if gains > 0 else 50.0
    rs = gains / losses
    return 100.0 - (100.0 / (1.0 + rs))

def on_bar(ctx, bar):
    need = ctx.rsi_period + 3
    bars = ctx.bars(need)
    if len(bars) < need:
        return
    closes = [b['close'] for b in bars]
    r = _rsi_simple(closes, ctx.rsi_period)
    if r is None:
        return
    price = bar['close']
    if r <= ctx.oversold and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"RSI BUY r={r:.1f} at {price:.2f}")
    elif r >= ctx.overbought and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"RSI SELL r={r:.1f} at {price:.2f}")
`,
    params: [
      { name: 'rsi_period', type: 'integer', default: 14, min: 2, max: 100, step: 1 },
      { name: 'oversold', type: 'number', default: 30, min: 1, max: 50, step: 1 },
      { name: 'overbought', type: 'number', default: 70, min: 50, max: 99, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.5, min: 0.05, max: 1, step: 0.01 }
    ]
  },
  {
    key: 'macdCross',
    icon: '📊',
    code: `"""
MACD histogram crossover
Enters long when MACD histogram crosses above zero; exits when it crosses below.
"""

def on_init(ctx):
    ctx.macd_fast = ctx.param('macd_fast', 12)
    ctx.macd_slow = ctx.param('macd_slow', 26)
    ctx.macd_signal = ctx.param('macd_signal', 9)
    ctx.position_pct = ctx.param('position_pct', 0.6)

def _ema_series(vals, period):
    k = 2.0 / (period + 1)
    out = []
    e = float(vals[0])
    out.append(e)
    for v in vals[1:]:
        v = float(v)
        e = v * k + e * (1 - k)
        out.append(e)
    return out

def _macd_hist_last_two(closes, fast, slow, sig):
    n = len(closes)
    if n < slow + sig + 2:
        return None, None
    ef = _ema_series(closes, fast)
    es = _ema_series(closes, slow)
    macd = [ef[i] - es[i] for i in range(n)]
    sg = _ema_series(macd, sig)
    hist = [macd[i] - sg[i] for i in range(n)]
    return hist[-2], hist[-1]

def on_bar(ctx, bar):
    need = ctx.macd_slow + ctx.macd_signal + 30
    bars = ctx.bars(need)
    if len(bars) < need:
        return
    closes = [b['close'] for b in bars]
    h0, h1 = _macd_hist_last_two(closes, ctx.macd_fast, ctx.macd_slow, ctx.macd_signal)
    if h0 is None:
        return
    price = bar['close']
    if h0 <= 0 and h1 > 0 and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"MACD cross up at {price:.2f}")
    elif h0 >= 0 and h1 < 0 and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"MACD cross down at {price:.2f}")
`,
    params: [
      { name: 'macd_fast', type: 'integer', default: 12, min: 2, max: 50, step: 1 },
      { name: 'macd_slow', type: 'integer', default: 26, min: 5, max: 120, step: 1 },
      { name: 'macd_signal', type: 'integer', default: 9, min: 2, max: 50, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.6, min: 0.05, max: 1, step: 0.01 }
    ]
  }
]

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toPythonLiteral (value) {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0'
  }
  if (value === null || value === undefined) {
    return 'None'
  }
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export const SCRIPT_TEMPLATE_CATALOG = TEMPLATE_DEFINITIONS

export function getScriptTemplateByKey (key) {
  return TEMPLATE_DEFINITIONS.find(item => item.key === key) || null
}

export function buildTemplateParamValues (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return {}
  return template.params.reduce((acc, param) => {
    acc[param.name] = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    return acc
  }, {})
}

export function buildTemplateCode (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return ''
  const values = buildTemplateParamValues(template, overrides)
  return template.params.reduce((code, param) => {
    const literal = toPythonLiteral(values[param.name])
    const pattern = new RegExp(`(ctx\\.param\\(['"]${escapeForRegExp(param.name)}['"],\\s*)([^\\)]+)(\\))`)
    return code.replace(pattern, `$1${literal}$3`)
  }, template.code)
}
