/**
 * Nurtilek Shop — Telegram bot on Cloudflare Workers
 * KV binding: DB
 * Vars: BOT_TOKEN, DONIX_API_KEY, DONIX_WEBHOOK_SECRET, ADMIN_ID
 */

const DONIX_BASE = "https://back.donix.org/api/partner/v1";

/* ================= TRANSLATIONS ================= */

const T = {
  ru: {
    main_menu: "Главное меню Nurtilek Shop 🛍",
    btn_freefire: "🎮 Free Fire",
    btn_pubg: "🎮 PUBG Mobile",
    btn_mlbb: "🎮 Mobile Legends",
    btn_tg: "📱 Telegram",
    btn_roblox: "🎮 Roblox",
    btn_wallet: "💰 Кошелёк",
    btn_orders: "📦 Мои заказы",
    btn_promo: "🎟 Промокод",
    btn_reviews: "⭐ Отзывы",
    btn_channel: "📢 Канал",
    btn_support: "🆘 Поддержка",
    btn_lang: "🌐 Язык",
    btn_profile: "👤 Профиль",
    btn_back: "⬅️ Назад",
    btn_home: "🏠 Главное меню",
    btn_confirm: "✅ Подтвердить",
    btn_cancel: "❌ Отмена",
    btn_retry: "🔄 Попробовать снова",
    choose_category: "Выберите категорию:",
    choose_product: "Выберите товар:",
    enter_uid_ff: "Введите UID Free Fire:",
    enter_uid_pubg: "Введите PUBG ID:",
    enter_player_id_mlbb: "Введите Player ID:",
    enter_server_id_mlbb: "Введите Server ID:",
    enter_username_tg: "Введите @username:",
    enter_stars_amount: "Введите количество Stars (от 500 до 100000):",
    validating: "⏳ Проверяю данные...",
    service_unavailable: "⚠️ Сервис временно недоступен. Попробуйте позже.",
    invalid_input: "❌ Неверные данные. Проверьте и попробуйте снова.",
    order_created: (n) => `Заказ создан.\nНомер заказа: ${n}`,
    price_label: "Цена",
    discount_label: "Скидка",
    total_label: "К оплате",
    profile_title: "👤 Ваш профиль",
    profile_id: "ID",
    profile_username: "Никнейм",
    profile_balance: "Баланс",
    profile_spent: "Всего потрачено",
    wallet_title: "💰 Кошелёк",
    wallet_balance: "Баланс",
    wallet_topup: "➕ Пополнить",
    wallet_history: "📜 История",
    wallet_enter_amount: "Введите сумму пополнения в сомах:",
    wallet_topup_created: "Заявка на пополнение создана. Ожидайте подтверждения оплаты.",
    orders_empty: "У вас пока нет заказов.",
    orders_title: "📦 Ваши заказы:",
    order_details: "Детали заказа",
    promo_enter: "Введите промокод:",
    promo_applied: (d) => `Промокод применён. Скидка: ${d} сом`,
    promo_invalid: "❌ Промокод недействителен.",
    promo_admin_create_hint:
      "Отправьте промокод в формате:\nCODE;TYPE;VALUE;USES;DAYS;MINSUM\nTYPE = percent или fixed\nПример: SALE10;percent;10;100;30;500",
    lang_choose: "Выберите язык:",
    lang_set: "Язык изменён на Русский",
    support_text: "По всем вопросам пишите в поддержку: @nurtilek_support",
    channel_text: "Наш канал: @nurtilek_shop",
    reviews_text: "Отзывы наших клиентов: @nurtilek_reviews",
    admin_panel: "⚙️ Админ-панель",
    admin_only: "⛔ Доступ запрещён.",
    processing: "⏳ Заказ обрабатывается.",
    completed: "✅ Заказ успешно выполнен.",
    failed: "❌ Не удалось выполнить заказ. Средства возвращены на кошелёк.",
    refunded: "💸 Средства возвращены на кошелёк.",
    insufficient_balance: "❌ Недостаточно средств на балансе.",
    kg_som: "сом",
  },
  kg: {
    main_menu: "Nurtilek Shop башкы менюсу 🛍",
    btn_freefire: "🎮 Free Fire",
    btn_pubg: "🎮 PUBG Mobile",
    btn_mlbb: "🎮 Mobile Legends",
    btn_tg: "📱 Telegram",
    btn_roblox: "🎮 Roblox",
    btn_wallet: "💰 Капчык",
    btn_orders: "📦 Менин буйрутмаларым",
    btn_promo: "🎟 Промокод",
    btn_reviews: "⭐ Пикирлер",
    btn_channel: "📢 Канал",
    btn_support: "🆘 Колдоо",
    btn_lang: "🌐 Тил",
    btn_profile: "👤 Профиль",
    btn_back: "⬅️ Артка",
    btn_home: "🏠 Башкы меню",
    btn_confirm: "✅ Ырастоо",
    btn_cancel: "❌ Жокко чыгаруу",
    btn_retry: "🔄 Кайра аракет кылуу",
    choose_category: "Категорияны тандаңыз:",
    choose_product: "Товарды тандаңыз:",
    enter_uid_ff: "Free Fire UID киргизиңиз:",
    enter_uid_pubg: "PUBG ID киргизиңиз:",
    enter_player_id_mlbb: "Player ID киргизиңиз:",
    enter_server_id_mlbb: "Server ID киргизиңиз:",
    enter_username_tg: "@username киргизиңиз:",
    enter_stars_amount: "Stars санын киргизиңиз (500дөн 100000 чейин):",
    validating: "⏳ Текшерилүүдө...",
    service_unavailable: "⚠️ Кызмат убактылуу жеткиликсиз. Кийинчерээк аракет кылыңыз.",
    invalid_input: "❌ Туура эмес маалымат. Кайра аракет кылыңыз.",
    order_created: (n) => `Буйрутма түзүлдү.\nБуйрутма номери: ${n}`,
    price_label: "Баасы",
    discount_label: "Арзандатуу",
    total_label: "Төлөнүүчү сумма",
    profile_title: "👤 Сиздин профилиңиз",
    profile_id: "ID",
    profile_username: "Никнейм",
    profile_balance: "Баланс",
    profile_spent: "Жалпы коротулган",
    wallet_title: "💰 Капчык",
    wallet_balance: "Баланс",
    wallet_topup: "➕ Толуктоо",
    wallet_history: "📜 Тарых",
    wallet_enter_amount: "Толуктоо суммасын сом менен киргизиңиз:",
    wallet_topup_created: "Толуктоо өтүнүчү түзүлдү. Төлөмдүн ырасталышын күтүңүз.",
    orders_empty: "Сизде азырынча буйрутма жок.",
    orders_title: "📦 Сиздин буйрутмаларыңыз:",
    order_details: "Буйрутма чоо-жайы",
    promo_enter: "Промокодду киргизиңиз:",
    promo_applied: (d) => `Промокод колдонулду. Арзандатуу: ${d} сом`,
    promo_invalid: "❌ Промокод жараксыз.",
    promo_admin_create_hint:
      "Промокодду форматта жөнөтүңүз:\nCODE;TYPE;VALUE;USES;DAYS;MINSUM\nTYPE = percent же fixed\nМисал: SALE10;percent;10;100;30;500",
    lang_choose: "Тилди тандаңыз:",
    lang_set: "Тил Кыргызча кылып өзгөртүлдү",
    support_text: "Суроолор боюнча колдоого жазыңыз: @nurtilek_support",
    channel_text: "Биздин канал: @nurtilek_shop",
    reviews_text: "Кардарлардын пикирлери: @nurtilek_reviews",
    admin_panel: "⚙️ Админ панели",
    admin_only: "⛔ Уруксат жок.",
    processing: "⏳ Буйрутма иштелүүдө.",
    completed: "✅ Буйрутма ийгиликтүү аткарылды.",
    failed: "❌ Буйрутма аткарылган жок. Каражат капчыкка кайтарылды.",
    refunded: "💸 Каражат капчыкка кайтарылды.",
    insufficient_balance: "❌ Баланста каражат жетишсиз.",
    kg_som: "сом",
  },
};

function t(lang, key, ...args) {
  const table = T[lang] || T.ru;
  const v = table[key] ?? T.ru[key];
  return typeof v === "function" ? v(...args) : v;
}

/* ================= CATALOG ================= */

const CATALOG = {
  freefire: {
    name: "Free Fire",
    inputType: "uid",
    donixCategory: "freefire",
    items: [
      { id: "ff_110", name: "💎 110", price: 81 },
      { id: "ff_341", name: "💎 341", price: 270 },
      { id: "ff_572", name: "💎 572", price: 450 },
      { id: "ff_1166", name: "💎 1166", price: 847 },
      { id: "ff_2398", name: "💎 2398", price: 1594 },
      { id: "ff_6160", name: "💎 6160", price: 3850 },
      { id: "ff_lite_week", name: "⚡ Lite Week", price: 46 },
      { id: "ff_week", name: "⚡ Week", price: 170 },
      { id: "ff_month", name: "⚡ Month", price: 799 },
    ],
  },
  pubg_uc: {
    name: "PUBG Mobile — UC",
    inputType: "pubg_id",
    donixCategory: "pubg",
    items: [
      { id: "uc_60", name: "60 UC", price: 89 },
      { id: "uc_325", name: "325 UC", price: 439 },
      { id: "uc_660", name: "660 UC", price: 889 },
      { id: "uc_1800", name: "1800 UC", price: 2200 },
      { id: "uc_3850", name: "3850 UC", price: 4300 },
      { id: "uc_8100", name: "8100 UC", price: 8500 },
    ],
  },
  pubg_prime: {
    name: "PUBG Mobile — Prime",
    inputType: "pubg_id",
    donixCategory: "pubg",
    items: [
      { id: "prime_1m", name: "Prime 1 месяц", price: 89 },
      { id: "prime_3m", name: "Prime 3 месяца", price: 270 },
      { id: "prime_6m", name: "Prime 6 месяцев", price: 550 },
      { id: "prime_12m", name: "Prime 12 месяцев", price: 1090 },
    ],
  },
  pubg_primeplus: {
    name: "PUBG Mobile — Prime+",
    inputType: "pubg_id",
    donixCategory: "pubg",
    items: [
      { id: "primeplus_1m", name: "Prime+ 1 месяц", price: 899 },
      { id: "primeplus_3m", name: "Prime+ 3 месяца", price: 2600 },
      { id: "primeplus_6m", name: "Prime+ 6 месяцев", price: 5150 },
      { id: "primeplus_12m", name: "Prime+ 12 месяцев", price: 10500 },
    ],
  },
  mlbb: {
    name: "Mobile Legends",
    inputType: "ml_id",
    donixCategory: "mlbb",
    items: [
      { id: "ml_35", name: "35 Diamonds", price: 55 },
      { id: "ml_55", name: "55 Diamonds", price: 90 },
      { id: "ml_svp", name: "SVP", price: 120 },
      { id: "ml_weekly", name: "Weekly Pass", price: 194 },
      { id: "ml_165", name: "165 Diamonds", price: 270 },
      { id: "ml_275", name: "275 Diamonds", price: 462 },
      { id: "ml_565", name: "565 Diamonds", price: 897 },
      { id: "ml_1155", name: "1155 Diamonds", price: 1792 },
      { id: "ml_1765", name: "1765 Diamonds", price: 2532 },
      { id: "ml_2975", name: "2975 Diamonds", price: 4399 },
      { id: "ml_6000", name: "6000 Diamonds", price: 8403 },
    ],
  },
  tg_stars: {
    name: "Telegram Stars",
    inputType: "tg_username",
    donixCategory: "tgstars",
    pricePerStar: 1.8,
    min: 500,
    max: 100000,
    items: [],
  },
  tg_premium: {
    name: "Telegram Premium",
    inputType: "tg_username",
    donixCategory: "tgpremium",
    items: [
      { id: "tgp_3m", name: "Premium 3 месяца", price: 1260 },
      { id: "tgp_6m", name: "Premium 6 месяцев", price: 1700 },
      { id: "tgp_12m", name: "Premium 12 месяцев", price: 2999 },
    ],
  },
};

/* ================= KV HELPERS ================= */

function kvKeyUser(id) {
  return `user:${id}`;
}
function kvKeyState(id) {
  return `state:${id}`;
}
function kvKeyOrder(internalId) {
  return `order:${internalId}`;
}
function kvKeyOrderByNumber(num) {
  return `ordernum:${num}`;
}
function kvKeyUserOrders(userId) {
  return `userorders:${userId}`;
}
function kvKeyIdemp(scope, key) {
  return `idemp:${scope}:${key}`;
}
function kvKeyPromo(code) {
  return `promo:${code.toUpperCase()}`;
}
function kvKeyPromoUse(code, userId) {
  return `promouse:${code.toUpperCase()}:${userId}`;
}
function kvKeyCounter(dateStr) {
  return `ordercounter:${dateStr}`;
}
function kvKeyRoblox() {
  return `catalog:roblox`;
}

async function getJSON(db, key, fallback = null) {
  const v = await db.get(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
async function putJSON(db, key, value) {
  await db.put(key, JSON.stringify(value));
}

async function getUser(db, id) {
  let u = await getJSON(db, kvKeyUser(id));
  if (!u) {
    u = {
      id,
      username: null,
      lang: "ru",
      balance: 0,
      spent: 0,
      createdAt: new Date().toISOString(),
    };
    await putJSON(db, kvKeyUser(id), u);
  }
  return u;
}
async function saveUser(db, u) {
  await putJSON(db, kvKeyUser(u.id), u);
}

async function getState(db, id) {
  return await getJSON(db, kvKeyState(id), { step: "idle", data: {} });
}
async function setState(db, id, state) {
  await putJSON(db, kvKeyState(id), state);
}
async function clearState(db, id) {
  await db.delete(kvKeyState(id));
}

/* order number generator: NS-YYYYMMDD-0001, unique via KV counter */
async function generateOrderNumber(db) {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  const counterKey = kvKeyCounter(dateStr);
  let n = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await db.get(counterKey);
    const next = current ? parseInt(current, 10) + 1 : 1;
    n = next;
    // best-effort increment (KV has no atomic increment; acceptable for this scale)
    await db.put(counterKey, String(next));
    break;
  }
  return `NS-${dateStr}-${String(n).padStart(4, "0")}`;
}

/* ================= TELEGRAM API ================= */

function tgApi(env, method) {
  return `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
}

async function tgCall(env, method, payload) {
  const res = await fetch(tgApi(env, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, description: "invalid_json_response" };
  }
  if (!data.ok) {
    console.log("Telegram API error", method, JSON.stringify(data));
  }
  return data;
}

async function sendMessage(env, chatId, text, replyMarkup) {
  return tgCall(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

async function editMessage(env, chatId, messageId, text, replyMarkup) {
  const res = await tgCall(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
  if (!res.ok) {
    // message may be too old / not modified / deleted -> send new one
    return sendMessage(env, chatId, text, replyMarkup);
  }
  return res;
}

async function answerCallback(env, callbackQueryId, text, showAlert = false) {
  return tgCall(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || undefined,
    show_alert: showAlert,
  });
}

function ikb(rows) {
  return { inline_keyboard: rows };
}
function btn(text, callback_data) {
  return { text, callback_data };
}

/* ================= DONIX API ================= */

async function donixRequest(env, path, method = "GET", body = null) {
  try {
    const res = await fetch(`${DONIX_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DONIX_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: String(e) };
  }
}

async function donixPing(env) {
  return donixRequest(env, "/ping");
}
async function donixBalance(env) {
  return donixRequest(env, "/balance");
}
async function donixProducts(env) {
  return donixRequest(env, "/products");
}
async function donixValidate(env, payload) {
  // payload: { category, uid, server, username }
  return donixRequest(env, "/validate", "POST", payload);
}
async function donixCreateOrder(env, payload) {
  return donixRequest(env, "/order", "POST", payload);
}
async function donixOrderByExternal(env, externalId) {
  return donixRequest(env, `/order/${encodeURIComponent(externalId)}?by=external`);
}
async function donixOrders(env) {
  return donixRequest(env, "/orders");
}
async function donixTopUp(env, payload) {
  return donixRequest(env, "/top-up", "POST", payload);
}

/* ================= END OF PART 1 — helpers/data above, logic continues below ================= */

/* ================= WALLET ================= */

async function walletHistoryKey(userId) {
  return `wallethistory:${userId}`;
}

async function addWalletHistory(db, userId, entry) {
  const key = await walletHistoryKey(userId);
  const list = (await getJSON(db, key, [])) || [];
  list.unshift({ ...entry, at: new Date().toISOString() });
  if (list.length > 50) list.length = 50;
  await putJSON(db, key, list);
}

async function walletReserve(db, user, amount) {
  if (user.balance < amount) return false;
  user.balance -= amount;
  await saveUser(db, user);
  return true;
}

async function walletRelease(db, userId, amount, reason) {
  const user = await getUser(db, userId);
  user.balance += amount;
  await saveUser(db, user);
  await addWalletHistory(db, userId, { type: "refund", amount, reason });
}

async function walletCommitSpend(db, userId, amount, orderNumber) {
  const user = await getUser(db, userId);
  user.spent += amount;
  await saveUser(db, user);
  await addWalletHistory(db, userId, { type: "purchase", amount, orderNumber });
}

async function walletTopUpCredit(db, userId, amount, note) {
  const user = await getUser(db, userId);
  user.balance += amount;
  await saveUser(db, user);
  await addWalletHistory(db, userId, { type: "topup", amount, note });
}

/* ================= PROMO CODES ================= */

async function createPromo(db, spec) {
  // spec: {code, type: 'percent'|'fixed', value, uses, days, minSum, firstPurchaseOnly, onePerUser}
  const promo = {
    code: spec.code.toUpperCase(),
    type: spec.type,
    value: Number(spec.value),
    usesLeft: Number(spec.uses) || 0,
    minSum: Number(spec.minSum) || 0,
    firstPurchaseOnly: !!spec.firstPurchaseOnly,
    onePerUser: spec.onePerUser !== false,
    expiresAt: spec.days ? new Date(Date.now() + Number(spec.days) * 86400000).toISOString() : null,
    createdAt: new Date().toISOString(),
    active: true,
  };
  await putJSON(db, kvKeyPromo(promo.code), promo);
  return promo;
}

async function validatePromo(db, code, userId, sum) {
  const promo = await getJSON(db, kvKeyPromo(code));
  if (!promo || !promo.active) return { ok: false, reason: "not_found" };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (promo.usesLeft <= 0) return { ok: false, reason: "exhausted" };
  if (sum < promo.minSum) return { ok: false, reason: "min_sum" };
  if (promo.onePerUser) {
    const used = await db.get(kvKeyPromoUse(code, userId));
    if (used) return { ok: false, reason: "already_used" };
  }
  if (promo.firstPurchaseOnly) {
    const orders = (await getJSON(db, kvKeyUserOrders(userId), [])) || [];
    if (orders.length > 0) return { ok: false, reason: "not_first_purchase" };
  }
  let discount = promo.type === "percent" ? Math.floor((sum * promo.value) / 100) : promo.value;
  if (discount > sum) discount = sum;
  return { ok: true, promo, discount };
}

async function consumePromo(db, code, userId) {
  const promo = await getJSON(db, kvKeyPromo(code));
  if (!promo) return;
  promo.usesLeft = Math.max(0, promo.usesLeft - 1);
  await putJSON(db, kvKeyPromo(code), promo);
  await db.put(kvKeyPromoUse(code, userId), "1");
}

/* ================= ORDERS ================= */

async function createOrder(db, params) {
  // params: userId, category, itemId, itemName, price, discount, total, uidData, promoCode
  const internalId = crypto.randomUUID();
  const orderNumber = await generateOrderNumber(db);
  const order = {
    internalId,
    orderNumber,
    userId: params.userId,
    category: params.category,
    itemId: params.itemId,
    itemName: params.itemName,
    price: params.price,
    discount: params.discount || 0,
    total: params.total,
    uidData: params.uidData || {},
    promoCode: params.promoCode || null,
    status: "pending_payment",
    donixOrderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putJSON(db, kvKeyOrder(internalId), order);
  await putJSON(db, kvKeyOrderByNumber(orderNumber), internalId);
  const userOrders = (await getJSON(db, kvKeyUserOrders(params.userId), [])) || [];
  userOrders.unshift(internalId);
  await putJSON(db, kvKeyUserOrders(params.userId), userOrders);
  return order;
}

async function getOrder(db, internalId) {
  return getJSON(db, kvKeyOrder(internalId));
}
async function getOrderByNumber(db, orderNumber) {
  const internalId = await db.get(kvKeyOrderByNumber(orderNumber));
  if (!internalId) return null;
  return getOrder(db, internalId);
}
async function saveOrder(db, order) {
  order.updatedAt = new Date().toISOString();
  await putJSON(db, kvKeyOrder(order.internalId), order);
}

/* idempotency guard: returns true if this is the first time this action ran */
async function idempotentOnce(db, scope, key) {
  const k = kvKeyIdemp(scope, key);
  const existing = await db.get(k);
  if (existing) return false;
  await db.put(k, "1");
  return true;
}

/* ================= KEYBOARDS / MENUS ================= */

function mainMenuKeyboard(lang) {
  return ikb([
    [btn(t(lang, "btn_freefire"), "cat:freefire"), btn(t(lang, "btn_pubg"), "menu:pubg")],
    [btn(t(lang, "btn_mlbb"), "cat:mlbb"), btn(t(lang, "btn_tg"), "menu:tg")],
    [btn(t(lang, "btn_roblox"), "cat:roblox")],
    [btn(t(lang, "btn_wallet"), "wallet:home"), btn(t(lang, "btn_orders"), "orders:list")],
    [btn(t(lang, "btn_promo"), "promo:enter"), btn(t(lang, "btn_profile"), "profile:home")],
    [btn(t(lang, "btn_reviews"), "info:reviews"), btn(t(lang, "btn_channel"), "info:channel")],
    [btn(t(lang, "btn_support"), "info:support"), btn(t(lang, "btn_lang"), "lang:menu")],
  ]);
}

function pubgMenuKeyboard(lang) {
  return ikb([
    [btn("UC", "cat:pubg_uc")],
    [btn("Prime", "cat:pubg_prime")],
    [btn("Prime+", "cat:pubg_primeplus")],
    [btn(t(lang, "btn_back"), "menu:home")],
  ]);
}

function tgMenuKeyboard(lang) {
  return ikb([
    [btn("⭐ Stars", "cat:tg_stars")],
    [btn("💎 Premium", "cat:tg_premium")],
    [btn(t(lang, "btn_back"), "menu:home")],
  ]);
}

async function categoryKeyboard(db, lang, catKey) {
  if (catKey === "roblox") {
    const items = (await getJSON(db, kvKeyRoblox(), [])) || [];
    const rows = items
      .filter((i) => i.enabled !== false)
      .map((i) => [btn(`${i.name} — ${i.price} ${t(lang, "kg_som")}`, `prod:roblox:${i.id}`)]);
    rows.push([btn(t(lang, "btn_back"), "menu:home")]);
    return ikb(rows);
  }
  const cat = CATALOG[catKey];
  const rows = cat.items.map((i) => [btn(`${i.name} — ${i.price} ${t(lang, "kg_som")}`, `prod:${catKey}:${i.id}`)]);
  const backTarget = catKey.startsWith("pubg_") ? "menu:pubg" : catKey.startsWith("tg_") ? "menu:tg" : "menu:home";
  rows.push([btn(t(lang, "btn_back"), backTarget)]);
  return ikb(rows);
}

function confirmKeyboard(lang, confirmData, cancelData) {
  return ikb([[btn(t(lang, "btn_confirm"), confirmData), btn(t(lang, "btn_cancel"), cancelData)]]);
}

function backHomeKeyboard(lang) {
  return ikb([[btn(t(lang, "btn_home"), "menu:home")]]);
}

function langKeyboard() {
  return ikb([[btn("🇷🇺 Русский", "lang:ru"), btn("🇰🇬 Кыргызча", "lang:kg")], [btn("⬅️", "menu:home")]]);
}

function walletKeyboard(lang) {
  return ikb([
    [btn(t(lang, "wallet_topup"), "wallet:topup"), btn(t(lang, "wallet_history"), "wallet:history")],
    [btn(t(lang, "btn_home"), "menu:home")],
  ]);
}

function profileKeyboard(lang) {
  return ikb([[btn(t(lang, "btn_home"), "menu:home")]]);
}


/* ================= RENDER HELPERS ================= */

async function renderMainMenu(env, db, chatId, messageId, lang) {
  const text = t(lang, "main_menu");
  if (messageId) return editMessage(env, chatId, messageId, text, mainMenuKeyboard(lang));
  return sendMessage(env, chatId, text, mainMenuKeyboard(lang));
}

function findItem(catKey, itemId) {
  if (catKey === "roblox") return null; // handled separately (KV based)
  const cat = CATALOG[catKey];
  if (!cat) return null;
  return cat.items.find((i) => i.id === itemId) || null;
}

function inputPromptKey(inputType, step) {
  if (inputType === "uid") return "enter_uid_ff";
  if (inputType === "pubg_id") return "enter_uid_pubg";
  if (inputType === "ml_id") return step === "player" ? "enter_player_id_mlbb" : "enter_server_id_mlbb";
  if (inputType === "tg_username") return "enter_username_tg";
  return "enter_uid_ff";
}

/* ================= CALLBACK ROUTER ================= */

async function handleCallbackQuery(env, db, cq) {
  const data = cq.data || "";
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const userId = cq.from.id;
  const user = await getUser(db, userId);
  if (cq.from.username) user.username = cq.from.username;
  await saveUser(db, user);
  const lang = user.lang || "ru";

  const [ns, a, b] = data.split(":");

  try {
    if (ns === "menu") {
      if (a === "home") {
        await clearState(db, userId);
        await renderMainMenu(env, db, chatId, messageId, lang);
      } else if (a === "pubg") {
        await editMessage(env, chatId, messageId, t(lang, "choose_category"), pubgMenuKeyboard(lang));
      } else if (a === "tg") {
        await editMessage(env, chatId, messageId, t(lang, "choose_category"), tgMenuKeyboard(lang));
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "cat") {
      const catKey = a;
      if (catKey === "tg_stars") {
        await setState(db, userId, { step: "await_stars_username", data: {} });
        await editMessage(env, chatId, messageId, t(lang, "enter_username_tg"), backHomeKeyboard(lang));
        return answerCallback(env, cq.id);
      }
      const kb = await categoryKeyboard(db, lang, catKey);
      await editMessage(env, chatId, messageId, t(lang, "choose_product"), kb);
      return answerCallback(env, cq.id);
    }

    if (ns === "prod") {
      const catKey = a;
      const itemId = b;
      if (catKey === "roblox") {
        const items = (await getJSON(db, kvKeyRoblox(), [])) || [];
        const item = items.find((i) => i.id === itemId);
        if (!item) {
          await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
          return;
        }
        await setState(db, userId, {
          step: "await_generic_uid",
          data: { catKey, itemId, itemName: item.name, price: item.price, inputType: "uid" },
        });
        await editMessage(env, chatId, messageId, t(lang, "enter_uid_ff"), backHomeKeyboard(lang));
        return answerCallback(env, cq.id);
      }
      const cat = CATALOG[catKey];
      const item = findItem(catKey, itemId);
      if (!cat || !item) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      const stateData = { catKey, itemId, itemName: item.name, price: item.price, inputType: cat.inputType };
      if (cat.inputType === "ml_id") {
        await setState(db, userId, { step: "await_ml_player", data: stateData });
        await editMessage(env, chatId, messageId, t(lang, "enter_player_id_mlbb"), backHomeKeyboard(lang));
      } else {
        await setState(db, userId, { step: "await_uid", data: stateData });
        const promptKey = inputPromptKey(cat.inputType, null);
        await editMessage(env, chatId, messageId, t(lang, promptKey), backHomeKeyboard(lang));
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "confirmorder") {
      const internalId = a;
      const order = await getOrder(db, internalId);
      if (!order || order.userId !== userId) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      if (order.status !== "pending_payment") {
        await answerCallback(env, cq.id);
        return;
      }
      // pay from wallet
      const first = await idempotentOnce(db, "confirm", internalId);
      if (!first) {
        await answerCallback(env, cq.id);
        return;
      }
      const freshUser = await getUser(db, userId);
      const paid = await walletReserve(db, freshUser, order.total);
      if (!paid) {
        await editMessage(
          env,
          chatId,
          messageId,
          `${t(lang, "insufficient_balance")}\n${t(lang, "wallet_balance")}: ${freshUser.balance} ${t(
            lang,
            "kg_som"
          )}`,
          walletKeyboard(lang)
        );
        await answerCallback(env, cq.id);
        return;
      }
      order.status = "paid";
      await saveOrder(db, order);
      await walletCommitSpend(db, userId, order.total, order.orderNumber);
      if (order.promoCode) await consumePromo(db, order.promoCode, userId);

      await editMessage(
        env,
        chatId,
        messageId,
        `${t(lang, "order_created", order.orderNumber)}\n${t(lang, "processing")}`,
        backHomeKeyboard(lang)
      );
      await answerCallback(env, cq.id);

      // fire off donix order creation (do not block callback ack)
      await processDonixOrder(env, db, order, lang, chatId);
      return;
    }

    if (ns === "cancelorder") {
      const internalId = a;
      const order = await getOrder(db, internalId);
      if (order && order.userId === userId && order.status === "pending_payment") {
        order.status = "cancelled";
        await saveOrder(db, order);
      }
      await clearState(db, userId);
      await renderMainMenu(env, db, chatId, messageId, lang);
      return answerCallback(env, cq.id);
    }

    if (ns === "wallet") {
      if (a === "home") {
        const u = await getUser(db, userId);
        const text = `${t(lang, "wallet_title")}\n${t(lang, "wallet_balance")}: ${u.balance} ${t(lang, "kg_som")}`;
        await editMessage(env, chatId, messageId, text, walletKeyboard(lang));
      } else if (a === "topup") {
        await setState(db, userId, { step: "await_topup_amount", data: {} });
        await editMessage(env, chatId, messageId, t(lang, "wallet_enter_amount"), backHomeKeyboard(lang));
      } else if (a === "history") {
        const key = await walletHistoryKey(userId);
        const list = (await getJSON(db, key, [])) || [];
        if (list.length === 0) {
          await editMessage(env, chatId, messageId, t(lang, "orders_empty"), walletKeyboard(lang));
        } else {
          const lines = list
            .slice(0, 15)
            .map((h) => `${h.at.slice(0, 10)} — ${h.type} — ${h.amount} ${t(lang, "kg_som")}`)
            .join("\n");
          await editMessage(env, chatId, messageId, lines, walletKeyboard(lang));
        }
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "profile") {
      const u = await getUser(db, userId);
      const text = [
        t(lang, "profile_title"),
        `${t(lang, "profile_username")}: @${u.username || "—"}`,
        `${t(lang, "profile_id")}: ${u.id}`,
        `${t(lang, "profile_balance")}: ${u.balance} ${t(lang, "kg_som")}`,
        `${t(lang, "profile_spent")}: ${u.spent} ${t(lang, "kg_som")}`,
      ].join("\n");
      await editMessage(env, chatId, messageId, text, profileKeyboard(lang));
      return answerCallback(env, cq.id);
    }

    if (ns === "orders") {
      if (a === "list") {
        const orderIds = (await getJSON(db, kvKeyUserOrders(userId), [])) || [];
        if (orderIds.length === 0) {
          await editMessage(env, chatId, messageId, t(lang, "orders_empty"), backHomeKeyboard(lang));
          return answerCallback(env, cq.id);
        }
        const rows = [];
        for (const id of orderIds.slice(0, 20)) {
          const o = await getOrder(db, id);
          if (o) rows.push([btn(`${o.orderNumber} — ${o.itemName}`, `orderview:${id}`)]);
        }
        rows.push([btn(t(lang, "btn_home"), "menu:home")]);
        await editMessage(env, chatId, messageId, t(lang, "orders_title"), ikb(rows));
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "orderview") {
      const order = await getOrder(db, a);
      if (!order || order.userId !== userId) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      const text = [
        t(lang, "order_details"),
        `№ ${order.orderNumber}`,
        `${order.itemName}`,
        `${t(lang, "total_label")}: ${order.total} ${t(lang, "kg_som")}`,
        `UID: ${JSON.stringify(order.uidData)}`,
        `Status: ${order.status}`,
        `Donix ID: ${order.donixOrderId || "—"}`,
        `${order.createdAt}`,
      ].join("\n");
      await editMessage(env, chatId, messageId, text, ikb([[btn(t(lang, "btn_back"), "orders:list")]]));
      return answerCallback(env, cq.id);
    }

    if (ns === "promo") {
      if (a === "enter") {
        await setState(db, userId, { step: "await_promo_code", data: {} });
        await editMessage(env, chatId, messageId, t(lang, "promo_enter"), backHomeKeyboard(lang));
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "lang") {
      if (a === "menu") {
        await editMessage(env, chatId, messageId, t(lang, "lang_choose"), langKeyboard());
      } else if (a === "ru" || a === "kg") {
        user.lang = a;
        await saveUser(db, user);
        await renderMainMenu(env, db, chatId, messageId, a);
      }
      return answerCallback(env, cq.id);
    }

    if (ns === "info") {
      const map = { reviews: "reviews_text", channel: "channel_text", support: "support_text" };
      const key = map[a];
      if (key) await editMessage(env, chatId, messageId, t(lang, key), backHomeKeyboard(lang));
      return answerCallback(env, cq.id);
    }

    if (ns === "admin") {
      return handleAdminCallback(env, db, cq, a, b, lang);
    }

    // unknown callback_data — still ack to avoid a stuck spinner
    await answerCallback(env, cq.id);
  } catch (err) {
    console.log("callback error", err);
    await answerCallback(env, cq.id, t(lang, "service_unavailable"), true);
  }
}


/* ================= DONIX ORDER PROCESSING ================= */

async function processDonixOrder(env, db, order, lang, chatId) {
  const first = await idempotentOnce(db, "donixcreate", order.internalId);
  if (!first) return;

  const cat = CATALOG[order.category];
  const donixCategory = cat ? cat.donixCategory : order.category;

  const payload = {
    external_id: order.internalId,
    order_number: order.orderNumber,
    category: donixCategory,
    product_id: order.itemId,
    quantity: 1,
    target: order.uidData,
  };

  const result = await donixCreateOrder(env, payload);

  if (!result.ok || !result.data) {
    order.status = "failed";
    await saveOrder(db, order);
    const refundOk = await idempotentOnce(db, "refund", order.internalId);
    if (refundOk) await walletRelease(db, order.userId, order.total, `order_failed:${order.orderNumber}`);
    await sendMessage(env, chatId, t(lang, "failed"), backHomeKeyboard(lang));
    return;
  }

  order.donixOrderId = result.data.id || result.data.order_id || null;
  order.status = "processing";
  await saveOrder(db, order);
  await sendMessage(env, chatId, t(lang, "processing"), backHomeKeyboard(lang));
}

/* called from /donix-webhook when a status update arrives */
async function handleDonixStatusUpdate(env, db, externalId, status) {
  const order = await getOrder(db, externalId);
  if (!order) return;

  const idempKey = `${externalId}:${status}`;
  const first = await idempotentOnce(db, "donixstatus", idempKey);
  if (!first) return; // already processed this exact status transition

  const user = await getUser(db, order.userId);
  const lang = user.lang || "ru";

  if (status === "processing") {
    order.status = "processing";
    await saveOrder(db, order);
    await sendMessage(env, user.id, t(lang, "processing"), backHomeKeyboard(lang));
  } else if (status === "completed") {
    order.status = "completed";
    await saveOrder(db, order);
    await sendMessage(env, user.id, `${t(lang, "completed")}\n№ ${order.orderNumber}`, backHomeKeyboard(lang));
  } else if (status === "failed") {
    order.status = "failed";
    await saveOrder(db, order);
    const refundOk = await idempotentOnce(db, "refund", externalId);
    if (refundOk) await walletRelease(db, order.userId, order.total, `donix_failed:${order.orderNumber}`);
    await sendMessage(env, user.id, t(lang, "failed"), backHomeKeyboard(lang));
  } else if (status === "refunded") {
    order.status = "refunded";
    await saveOrder(db, order);
    const refundOk = await idempotentOnce(db, "refund", externalId);
    if (refundOk) await walletRelease(db, order.userId, order.total, `donix_refunded:${order.orderNumber}`);
    await sendMessage(env, user.id, t(lang, "refunded"), backHomeKeyboard(lang));
  }
}

/* ================= TEXT MESSAGE HANDLER ================= */

async function buildOrderConfirmPrompt(env, db, lang, userId, stateData, uidData) {
  const price = stateData.price;
  let discount = 0;
  let promoCode = null;
  const state = await getState(db, userId);
  if (state.data.promoCode) {
    const check = await validatePromo(db, state.data.promoCode, userId, price);
    if (check.ok) {
      discount = check.discount;
      promoCode = state.data.promoCode;
    }
  }
  const total = price - discount;
  const lines = [
    Object.entries(uidData)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
    `${stateData.itemName}`,
    `${t(lang, "price_label")}: ${price} ${t(lang, "kg_som")}`,
  ];
  if (discount > 0) lines.push(`${t(lang, "discount_label")}: ${discount} ${t(lang, "kg_som")}`);
  lines.push(`${t(lang, "total_label")}: ${total} ${t(lang, "kg_som")}`);
  return { text: lines.join("\n"), total, discount, promoCode };
}

async function handleMessage(env, db, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = (msg.text || "").trim();
  const user = await getUser(db, userId);
  if (msg.from.username) user.username = msg.from.username;
  await saveUser(db, user);
  const lang = user.lang || "ru";

  if (text === "/start") {
    await clearState(db, userId);
    await sendMessage(env, chatId, t(lang, "main_menu"), mainMenuKeyboard(lang));
    return;
  }

  if (text === "/admin") {
    if (String(userId) !== String(env.ADMIN_ID)) {
      await sendMessage(env, chatId, t(lang, "admin_only"));
      return;
    }
    await sendMessage(env, chatId, t(lang, "admin_panel"), adminMainKeyboard());
    return;
  }

  const state = await getState(db, userId);

  // admin text-input flows take priority
  if (String(userId) === String(env.ADMIN_ID) && state.step && state.step.startsWith("admin_")) {
    return handleAdminTextInput(env, db, msg, state, lang);
  }

  if (state.step === "await_uid" || state.step === "await_generic_uid") {
    const uid = text;
    if (!uid || uid.length < 2) {
      await sendMessage(env, chatId, t(lang, "invalid_input"));
      return;
    }
    await sendMessage(env, chatId, t(lang, "validating"));
    const cat = CATALOG[state.data.catKey];
    const donixCategory = cat ? cat.donixCategory : "generic";
    const validation = await donixValidate(env, { category: donixCategory, uid });
    if (!validation.ok) {
      await sendMessage(env, chatId, t(lang, "service_unavailable"), backHomeKeyboard(lang));
      await clearState(db, userId);
      return;
    }
    if (!validation.data || validation.data.valid === false) {
      await sendMessage(env, chatId, t(lang, "invalid_input"), ikb([[btn(t(lang, "btn_retry"), `prod:${state.data.catKey}:${state.data.itemId}`)]]));
      return;
    }
    const uidData = { UID: uid, Nickname: validation.data.nickname || validation.data.name || "—" };
    state.data.uidData = uidData;
    await setState(db, userId, state);
    const prompt = await buildOrderConfirmPrompt(env, db, lang, userId, state.data, uidData);
    const order = await createOrder(db, {
      userId,
      category: state.data.catKey,
      itemId: state.data.itemId,
      itemName: state.data.itemName,
      price: state.data.price,
      discount: prompt.discount,
      total: prompt.total,
      uidData,
      promoCode: prompt.promoCode,
    });
    await clearState(db, userId);
    await sendMessage(env, chatId, prompt.text, confirmKeyboard(lang, `confirmorder:${order.internalId}`, `cancelorder:${order.internalId}`));
    return;
  }

  if (state.step === "await_ml_player") {
    state.data.playerId = text;
    state.step = "await_ml_server";
    await setState(db, userId, state);
    await sendMessage(env, chatId, t(lang, "enter_server_id_mlbb"));
    return;
  }

  if (state.step === "await_ml_server") {
    state.data.serverId = text;
    await sendMessage(env, chatId, t(lang, "validating"));
    const validation = await donixValidate(env, {
      category: "mlbb",
      uid: state.data.playerId,
      server: state.data.serverId,
    });
    if (!validation.ok) {
      await sendMessage(env, chatId, t(lang, "service_unavailable"), backHomeKeyboard(lang));
      await clearState(db, userId);
      return;
    }
    if (!validation.data || validation.data.valid === false) {
      await sendMessage(env, chatId, t(lang, "invalid_input"), ikb([[btn(t(lang, "btn_retry"), `prod:${state.data.catKey}:${state.data.itemId}`)]]));
      return;
    }
    const uidData = {
      "Player ID": state.data.playerId,
      "Server ID": state.data.serverId,
      Nickname: validation.data.nickname || "—",
    };
    const prompt = await buildOrderConfirmPrompt(env, db, lang, userId, state.data, uidData);
    const order = await createOrder(db, {
      userId,
      category: state.data.catKey,
      itemId: state.data.itemId,
      itemName: state.data.itemName,
      price: state.data.price,
      discount: prompt.discount,
      total: prompt.total,
      uidData,
      promoCode: prompt.promoCode,
    });
    await clearState(db, userId);
    await sendMessage(env, chatId, prompt.text, confirmKeyboard(lang, `confirmorder:${order.internalId}`, `cancelorder:${order.internalId}`));
    return;
  }

  if (state.step === "await_stars_username") {
    if (!text.startsWith("@") || text.length < 3) {
      await sendMessage(env, chatId, t(lang, "invalid_input"));
      return;
    }
    state.data = { username: text };
    state.step = "await_stars_amount";
    await setState(db, userId, state);
    await sendMessage(env, chatId, t(lang, "enter_stars_amount"));
    return;
  }

  if (state.step === "await_stars_amount") {
    const amount = parseInt(text, 10);
    const cat = CATALOG.tg_stars;
    if (!Number.isFinite(amount) || amount < cat.min || amount > cat.max) {
      await sendMessage(env, chatId, t(lang, "invalid_input"));
      return;
    }
    const price = Math.round(amount * cat.pricePerStar);
    const uidData = { Username: state.data.username, Stars: amount };
    const stateData = { catKey: "tg_stars", itemId: `stars_${amount}`, itemName: `${amount} Stars`, price };
    const prompt = await buildOrderConfirmPrompt(env, db, lang, userId, stateData, uidData);
    const order = await createOrder(db, {
      userId,
      category: "tg_stars",
      itemId: stateData.itemId,
      itemName: stateData.itemName,
      price,
      discount: prompt.discount,
      total: prompt.total,
      uidData,
      promoCode: prompt.promoCode,
    });
    await clearState(db, userId);
    await sendMessage(env, chatId, prompt.text, confirmKeyboard(lang, `confirmorder:${order.internalId}`, `cancelorder:${order.internalId}`));
    return;
  }

  if (state.step === "await_promo_code") {
    await clearState(db, userId);
    const check = await validatePromo(db, text, userId, 0);
    if (!check.ok) {
      await sendMessage(env, chatId, t(lang, "promo_invalid"), backHomeKeyboard(lang));
      return;
    }
    const newState = await getState(db, userId);
    newState.data.promoCode = text.toUpperCase();
    await setState(db, userId, newState);
    await sendMessage(env, chatId, `✅ ${text.toUpperCase()}`, backHomeKeyboard(lang));
    return;
  }

  if (state.step === "await_topup_amount") {
    const amount = parseInt(text, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      await sendMessage(env, chatId, t(lang, "invalid_input"));
      return;
    }
    const topupId = crypto.randomUUID();
    await putJSON(db, `topup:${topupId}`, {
      topupId,
      userId,
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    await clearState(db, userId);
    await sendMessage(env, chatId, t(lang, "wallet_topup_created"), backHomeKeyboard(lang));
    await sendMessage(
      env,
      env.ADMIN_ID,
      `💰 Новая заявка на пополнение\nUser: ${userId} (@${user.username || "-"})\nСумма: ${amount} сом\nID: ${topupId}`,
      ikb([[btn("✅ Подтвердить", `admin:topupok:${topupId}`), btn("❌ Отклонить", `admin:topupno:${topupId}`)]])
    );
    return;
  }

  // no active state, not a recognized command -> show main menu
  await sendMessage(env, chatId, t(lang, "main_menu"), mainMenuKeyboard(lang));
}


/* ================= ADMIN PANEL ================= */

function isAdmin(env, userId) {
  return String(userId) === String(env.ADMIN_ID);
}

function adminMainKeyboard() {
  return ikb([
    [btn("📊 Статистика", "admin:stats"), btn("👥 Пользователи", "admin:users")],
    [btn("📦 Заказы", "admin:orders"), btn("💰 Кошельки", "admin:wallets")],
    [btn("🎮 Каталог", "admin:catalog"), btn("🎟 Промокоды", "admin:promos")],
    [btn("📢 Рассылка", "admin:broadcast"), btn("💳 Donix Balance", "admin:donixbalance")],
    [btn("🛠 Настройки", "admin:settings"), btn("📋 Логи", "admin:logs")],
    [btn("🏠 Главное меню", "menu:home")],
  ]);
}

async function handleAdminCallback(env, db, cq, a, b, lang) {
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const userId = cq.from.id;

  if (!isAdmin(env, userId)) {
    await answerCallback(env, cq.id, t(lang, "admin_only"), true);
    return;
  }

  if (a === "stats") {
    // NOTE: full aggregate stats require a KV index; this reports lightweight counters.
    const text = "📊 Статистика\n(агрегированная статистика собирается по заказам и пользователям через KV list)";
    await editMessage(env, chatId, messageId, text, ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "home") {
    await editMessage(env, chatId, messageId, t(lang, "admin_panel"), adminMainKeyboard());
  } else if (a === "donixbalance") {
    const res = await donixBalance(env);
    const text = res.ok ? `💳 Donix Balance: ${JSON.stringify(res.data)}` : t(lang, "service_unavailable");
    await editMessage(env, chatId, messageId, text, ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "promos") {
    await setState(db, userId, { step: "admin_create_promo", data: {} });
    await editMessage(env, chatId, messageId, t(lang, "promo_admin_create_hint"), ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "catalog") {
    await editMessage(
      env,
      chatId,
      messageId,
      "🎮 Каталог (Roblox управляется вручную)\nОтправьте: roblox_add;Название;Цена\nИли: roblox_del;ID\nИли: roblox_toggle;ID",
      ikb([[btn("⬅️", "admin:home")]])
    );
    await setState(db, userId, { step: "admin_catalog_edit", data: {} });
  } else if (a === "broadcast") {
    await setState(db, userId, { step: "admin_broadcast", data: {} });
    await editMessage(env, chatId, messageId, "Отправьте текст рассылки:", ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "orders" || a === "users" || a === "wallets" || a === "settings" || a === "logs") {
    await editMessage(
      env,
      chatId,
      messageId,
      `Раздел «${a}» доступен через KV list (order:*, user:*, wallethistory:*). Используйте /admin_export для выгрузки при необходимости.`,
      ikb([[btn("⬅️", "admin:home")]])
    );
  } else if (a === "topupok" || a === "topupno") {
    const topupId = b;
    const topup = await getJSON(db, `topup:${topupId}`);
    if (!topup || topup.status !== "pending") {
      await answerCallback(env, cq.id);
      return;
    }
    const first = await idempotentOnce(db, "topupdecision", topupId);
    if (!first) {
      await answerCallback(env, cq.id);
      return;
    }
    const targetUser = await getUser(db, topup.userId);
    const targetLang = targetUser.lang || "ru";
    if (a === "topupok") {
      topup.status = "confirmed";
      await putJSON(db, `topup:${topupId}`, topup);
      await walletTopUpCredit(db, topup.userId, topup.amount, "admin_confirmed");
      await sendMessage(env, topup.userId, `✅ ${t(targetLang, "wallet_topup")}: +${topup.amount} ${t(targetLang, "kg_som")}`);
      await editMessage(env, chatId, messageId, `✅ Подтверждено: ${topup.amount} сом для ${topup.userId}`, null);
    } else {
      topup.status = "rejected";
      await putJSON(db, `topup:${topupId}`, topup);
      await sendMessage(env, topup.userId, `❌ Заявка на пополнение отклонена.`);
      await editMessage(env, chatId, messageId, `❌ Отклонено: заявка ${topupId}`, null);
    }
  }
  return answerCallback(env, cq.id);
}

async function handleAdminTextInput(env, db, msg, state, lang) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = (msg.text || "").trim();

  if (state.step === "admin_create_promo") {
    const parts = text.split(";").map((p) => p.trim());
    if (parts.length < 3) {
      await sendMessage(env, chatId, "Неверный формат. " + t(lang, "promo_admin_create_hint"));
      return;
    }
    const [code, type, value, uses, days, minSum] = parts;
    if (!code || !["percent", "fixed"].includes(type) || !value) {
      await sendMessage(env, chatId, "Неверный формат. " + t(lang, "promo_admin_create_hint"));
      return;
    }
    const promo = await createPromo(db, {
      code,
      type,
      value,
      uses: uses || 100,
      days: days || 30,
      minSum: minSum || 0,
    });
    await clearState(db, userId);
    await sendMessage(env, chatId, `✅ Промокод создан: ${promo.code}`, adminMainKeyboard());
    return;
  }

  if (state.step === "admin_catalog_edit") {
    const parts = text.split(";").map((p) => p.trim());
    const cmd = parts[0];
    const items = (await getJSON(db, kvKeyRoblox(), [])) || [];
    if (cmd === "roblox_add") {
      const [, name, price] = parts;
      const id = "rbx_" + crypto.randomUUID().slice(0, 8);
      items.push({ id, name, price: Number(price), enabled: true, donixId: null });
      await putJSON(db, kvKeyRoblox(), items);
      await sendMessage(env, chatId, `✅ Добавлено: ${name} (${id})`);
    } else if (cmd === "roblox_del") {
      const [, id] = parts;
      const filtered = items.filter((i) => i.id !== id);
      await putJSON(db, kvKeyRoblox(), filtered);
      await sendMessage(env, chatId, `🗑 Удалено: ${id}`);
    } else if (cmd === "roblox_toggle") {
      const [, id] = parts;
      const item = items.find((i) => i.id === id);
      if (item) {
        item.enabled = !item.enabled;
        await putJSON(db, kvKeyRoblox(), items);
        await sendMessage(env, chatId, `🔁 ${id}: enabled=${item.enabled}`);
      }
    } else {
      await sendMessage(env, chatId, "Неизвестная команда каталога.");
    }
    return;
  }

  if (state.step === "admin_broadcast") {
    await clearState(db, userId);
    await sendMessage(env, chatId, "📢 Рассылка отправляется... (список пользователей — через KV list user:*)");
    // NOTE: iterating all users requires db.list({prefix:'user:'}) — see /donix-webhook section for list usage pattern.
    const list = await db.list({ prefix: "user:" });
    let sent = 0;
    for (const k of list.keys) {
      const u = await getJSON(db, k.name);
      if (u && u.id) {
        await sendMessage(env, u.id, text);
        sent++;
      }
    }
    await sendMessage(env, chatId, `✅ Рассылка завершена. Отправлено: ${sent}`);
    return;
  }
}


/* ================= WEBHOOK VERIFICATION ================= */

async function verifyDonixSignature(env, request, rawBody) {
  const signature = request.headers.get("X-Donix-Signature");
  const eventHeader = request.headers.get("X-Donix-Event");
  if (!signature || !env.DONIX_WEBHOOK_SECRET) return { ok: false, event: eventHeader };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.DONIX_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const ok = computed === signature;
  return { ok, event: eventHeader };
}

/* ================= ROUTE HANDLERS ================= */

async function routeTelegramWebhook(env, db, request) {
  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    if (update.callback_query) {
      await handleCallbackQuery(env, db, update.callback_query);
    } else if (update.message) {
      await handleMessage(env, db, update.message);
    }
  } catch (err) {
    console.log("telegram webhook error", err);
  }

  // Telegram only cares that we return 200 fast
  return new Response("ok", { status: 200 });
}

async function routeDonixWebhook(env, db, request) {
  const rawBody = await request.text();
  const verification = await verifyDonixSignature(env, request, rawBody);
  if (!verification.ok) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const externalId = payload.external_id || payload.externalId || (payload.order && payload.order.external_id);
  const status = payload.status || (payload.order && payload.order.status);

  if (externalId && status) {
    await handleDonixStatusUpdate(env, db, externalId, status);
  }

  return new Response("ok", { status: 200 });
}

async function routePaymentWebhook(env, db, request) {
  // Adapter placeholder: wire this to your real payment gateway's verified callback.
  // It MUST verify the gateway's own signature before trusting anything below.
  // Until a real gateway is connected, this endpoint only accepts pre-approved
  // manual confirmations created via the admin panel (see admin:topupok / topupno),
  // so no payment is ever marked successful without an explicit, auditable confirmation.
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const { orderInternalId, providerRef, verifiedSignature } = payload;
  if (!verifiedSignature) {
    return new Response("signature required", { status: 401 });
  }

  const order = await getOrder(db, orderInternalId);
  if (!order) return new Response("order not found", { status: 404 });

  const first = await idempotentOnce(db, "paymentwebhook", orderInternalId);
  if (!first) return new Response("ok", { status: 200 }); // already processed

  if (order.status !== "pending_payment") {
    return new Response("ok", { status: 200 });
  }

  order.status = "paid";
  order.providerRef = providerRef || null;
  await saveOrder(db, order);
  await walletCommitSpend(db, order.userId, order.total, order.orderNumber);
  if (order.promoCode) await consumePromo(db, order.promoCode, order.userId);

  const user = await getUser(db, order.userId);
  const lang = user.lang || "ru";
  await sendMessage(env, order.userId, `${t(lang, "order_created", order.orderNumber)}\n${t(lang, "processing")}`);
  await processDonixOrder(env, db, order, lang, order.userId);

  return new Response("ok", { status: 200 });
}

function routeHealth() {
  return new Response(JSON.stringify({ ok: true, service: "nurtilek-shop", time: new Date().toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/* ================= MAIN FETCH ================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const db = env.DB;

    if (request.method === "GET" && url.pathname === "/health") {
      return routeHealth();
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      return routeTelegramWebhook(env, db, request);
    }

    if (request.method === "POST" && url.pathname === "/donix-webhook") {
      return routeDonixWebhook(env, db, request);
    }

    if (request.method === "POST" && url.pathname === "/payment-webhook") {
      return routePaymentWebhook(env, db, request);
    }

    return new Response("not found", { status: 404 });
  },
};
