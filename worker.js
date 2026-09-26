/**
 * Nurtilek Shop — Telegram bot on Cloudflare Workers
 * KV binding: DB
 * Vars/secrets: BOT_TOKEN, DONIX_API_KEY, DONIX_WEBHOOK_SECRET, ADMIN_ID,
 *   FINIK_API_KEY, FINIK_PRIVATE_KEY, FINIK_PUBLIC_KEY, FINIK_ACCOUNT_ID,
 *   FINIK_ENV ("beta" or "prod"), APP_BASE_URL
 */

import { Signer } from "@mancho.devs/authorizer";

const DONIX_BASE = "https://back.donix.org/api/partner/v1";

/* ================= FINIK PAYMENTS ================= */

function finikBaseUrl(env) {
  return env.FINIK_ENV === "prod"
    ? "https://api.acquiring.averspay.kg"
    : "https://beta.api.acquiring.averspay.kg";
}

/**
 * Creates a Finik QR payment and returns the hosted payment page URL.
 * amount: number in KGS (сом). paymentId: unique id, <= 36 chars (a UUID works).
 */
async function createFinikPayment(env, { amount, paymentId, redirectUrl, description, lang }) {
  const baseUrl = finikBaseUrl(env);
  const path = "/v1/payment";
  const host = new URL(baseUrl).host;
  const timestamp = Date.now().toString();

  const body = {
    Amount: amount,
    CardType: "FINIK_QR",
    PaymentId: paymentId,
    RedirectUrl: redirectUrl,
    Data: {
      accountId: env.FINIK_ACCOUNT_ID,
      name_en: "Nurtilek Shop",
      webhookUrl: `${env.APP_BASE_URL}/payment-webhook`,
      description: description || `Nurtilek Shop payment ${paymentId}`,
      Lang: lang === "kg" ? "ky" : "ru",
    },
  };

  const requestData = {
    httpMethod: "POST",
    path,
    headers: {
      Host: host,
      "x-api-key": env.FINIK_API_KEY,
      "x-api-timestamp": timestamp,
    },
    queryStringParameters: undefined,
    body,
  };

  const signature = await new Signer(requestData).sign(env.FINIK_PRIVATE_KEY);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.FINIK_API_KEY,
      "x-api-timestamp": timestamp,
      signature,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  if (res.status === 302) {
    const paymentUrl = res.headers.get("location");
    return { ok: true, paymentUrl };
  }

  let errorData = null;
  try {
    errorData = await res.json();
  } catch {
    // ignore parse failure
  }
  console.log("Finik create payment error", res.status, JSON.stringify(errorData));
  return { ok: false, status: res.status, error: errorData };
}

/**
 * Verifies the signature of an incoming Finik webhook request.
 * rawBody: the raw request body text (already read once).
 */
async function verifyFinikWebhookSignature(env, request, rawBody, url) {
  const signature = request.headers.get("signature");
  if (!signature) return false;

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const requestData = {
    httpMethod: "POST",
    path: url.pathname,
    headers: {
      Host: request.headers.get("host") || new URL(env.APP_BASE_URL).host,
      "x-api-timestamp": request.headers.get("x-api-timestamp") || "",
    },
    queryStringParameters: null,
    body,
  };

  try {
    return await new Signer(requestData).verify(env.FINIK_PUBLIC_KEY, signature);
  } catch (e) {
    console.log("Finik signature verify error", String(e));
    return false;
  }
}

/* ================= TRANSLATIONS ================= */

const T = {
  ru: {
    main_menu: "Главное меню Nurtilek Shop 🛍",
    btn_freefire: "🎮 Free Fire",
    btn_pubg: "🎮 PUBG Mobile",
    btn_mlbb: "🎮 Mobile Legends",
    btn_tg: "📱 Telegram",
    btn_games: "🎮 Игры и сервисы",
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
    btn_prices: "💰 Цены",
    btn_qty_confirm: "✅ Далее",
    choose_category: "Выберите раздел:",
    choose_product: "Выберите товар:",
    choose_qty: "Выберите количество:",
    qty_line: (n) => `Количество: ${n} (макс. 10)`,
    qty_total_line: (s) => `Сумма: ${s} сом`,
    prices_title: "💰 Цены:",
    enter_uid_ff: "Введите UID Free Fire:",
    enter_uid_pubg: "Введите PUBG ID:",
    enter_player_id_mlbb: "Введите Player ID:",
    enter_server_id_mlbb: "Введите Server ID:",
    enter_username_tg: "Введите @username:",
    enter_stars_amount: "Введите количество Stars (от 50 до 100000):",
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
    admin_panel: "⚙️ Админ-панель",
    admin_only: "⛔ Доступ запрещён.",
    processing: "⏳ Заказ обрабатывается.",
    completed: "✅ Заказ успешно выполнен.",
    failed: "❌ Не удалось выполнить заказ. Средства возвращены на кошелёк.",
    refunded: "💸 Средства возвращены на кошелёк.",
    insufficient_balance: "❌ Недостаточно средств на балансе.",
    kg_som: "сом",
    btn_referral: "🤝 Рефералка",
    btn_pay_balance: "💰 С баланса",
    btn_pay_bank: "🏦 Банк",
    btn_pay_terminal: "🧾 Терминал",
    choose_payment_method: "Выберите способ оплаты:",
    terminal_instructions:
      "Нажмите кнопку ниже — откроется личный чат с администратором с уже готовым текстом. Просто отправьте его и приложите чек об оплате.",
    terminal_dm_button: "📩 Написать администратору",
    order_completed_review_hint: "Будем рады, если оставите отзыв 🙂",
    btn_leave_review: "⭐ Оставить отзыв",
    referral_rate_line: (p) => `Ваша текущая ставка: ${p}%`,
    referral_link_label: "Ваша реферальная ссылка",
    referral_earned_label: "Заработано с рефералов",
    status_pending_payment: "🟡 Ожидает оплаты",
    status_processing: "🟡 В обработке",
    status_paid: "🟡 В обработке",
    status_completed: "🟢 Выполнен",
    status_cancelled: "🔴 Отменён",
    status_failed: "🔴 Не выполнен",
    status_refunded: "🔴 Возврат средств",
  },
  kg: {
    main_menu: "Nurtilek Shop башкы менюсу 🛍",
    btn_freefire: "🎮 Free Fire",
    btn_pubg: "🎮 PUBG Mobile",
    btn_mlbb: "🎮 Mobile Legends",
    btn_tg: "📱 Telegram",
    btn_games: "🎮 Оюндар жана кызматтар",
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
    btn_prices: "💰 Баалар",
    btn_qty_confirm: "✅ Кийинки",
    choose_category: "Бөлүмдү тандаңыз:",
    choose_product: "Товарды тандаңыз:",
    choose_qty: "Санын тандаңыз:",
    qty_line: (n) => `Саны: ${n} (макс. 10)`,
    qty_total_line: (s) => `Сумма: ${s} сом`,
    prices_title: "💰 Баалар:",
    enter_uid_ff: "Free Fire UID киргизиңиз:",
    enter_uid_pubg: "PUBG ID киргизиңиз:",
    enter_player_id_mlbb: "Player ID киргизиңиз:",
    enter_server_id_mlbb: "Server ID киргизиңиз:",
    enter_username_tg: "@username киргизиңиз:",
    enter_stars_amount: "Stars санын киргизиңиз (50дөн 100000 чейин):",
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
    admin_panel: "⚙️ Админ панели",
    admin_only: "⛔ Уруксат жок.",
    processing: "⏳ Буйрутма иштелүүдө.",
    completed: "✅ Буйрутма ийгиликтүү аткарылды.",
    failed: "❌ Буйрутма аткарылган жок. Каражат капчыкка кайтарылды.",
    refunded: "💸 Каражат капчыкка кайтарылды.",
    insufficient_balance: "❌ Баланста каражат жетишсиз.",
    kg_som: "сом",
    btn_referral: "🤝 Рефералка",
    btn_pay_balance: "💰 Баланстан",
    btn_pay_bank: "🏦 Банк",
    btn_pay_terminal: "🧾 Терминал",
    choose_payment_method: "Төлөм ыкмасын тандаңыз:",
    terminal_instructions:
      "Төмөнкү баскычты басыңыз — администратор менен даяр текст менен жеке чат ачылат. Аны жөнөтүп, төлөм чегин тиркеңиз.",
    terminal_dm_button: "📩 Администраторго жазуу",
    order_completed_review_hint: "Пикир калтырсаңыз кубанычтабыз 🙂",
    btn_leave_review: "⭐ Пикир калтыруу",
    referral_rate_line: (p) => `Учурдагы чегиңиз: ${p}%`,
    referral_link_label: "Сиздин реферал шилтемеңиз",
    referral_earned_label: "Рефералдардан тапкан",
    status_pending_payment: "🟡 Төлөм күтүлүүдө",
    status_processing: "🟡 Иштелүүдө",
    status_paid: "🟡 Иштелүүдө",
    status_completed: "🟢 Аткарылды",
    status_cancelled: "🔴 Жокко чыгарылды",
    status_failed: "🔴 Аткарылган жок",
    status_refunded: "🔴 Каражат кайтарылды",
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
      { id: "ff_lite_week", name: "🔹 Lite Ваучер (90💎)", price: 46 },
      { id: "ff_week", name: "🔹 Ваучер на неделю (450💎)", price: 170 },
      { id: "ff_month", name: "🔹 Ваучер на месяц (2600💎)", price: 699 },
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
    min: 50,
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
function kvKeyCounter() {
  return `ordercounter:global`;
}
function kvKeyConfig(key) {
  return `config:${key}`;
}
function kvKeyPriceOverride(catKey, itemId) {
  return `price:${catKey}:${itemId}`;
}
function kvKeyStarsPricePerStar() {
  return `config:tgstars_price_per_star`;
}
function kvKeyActivePromo(userId) {
  return `activepromo:${userId}`;
}
function kvKeyReferralOverride(username) {
  return `config:referral_percent_user:${(username || "").toLowerCase()}`;
}

const DEFAULT_REFERRAL_PERCENT = "0.5";
const DEFAULT_REFERRAL_TEXT_RU =
  "Если вы позовёте друга, вы будете получать {percent}% от каждой его покупки в магазине.\n\nЕсли хотите стать крупным партнёром с повышенным процентом (например, 1–1.5%) — свяжитесь с администрацией.";
const DEFAULT_REFERRAL_TEXT_KG =
  "Досуңузду чакырсаңыз, анын ар бир сатып алуусунан {percent}% аласыз.\n\nЖогорку пайыздуу ири өнөктөш болгуңуз келсе (мисалы, 1–1.5%) — администрация менен байланышыңыз.";

async function getReferralPercentForUsername(db, username) {
  if (username) {
    const override = await db.get(kvKeyReferralOverride(username));
    if (override) return parseFloat(override);
  }
  const global = await db.get(kvKeyConfig("referral_percent"));
  return parseFloat(global || DEFAULT_REFERRAL_PERCENT);
}

async function getReferralText(db, lang) {
  const stored = await db.get(kvKeyConfig("referral_text"));
  return stored || (lang === "kg" ? DEFAULT_REFERRAL_TEXT_KG : DEFAULT_REFERRAL_TEXT_RU);
}

/**
 * Credits the referrer of `buyerUserId` with a percentage of a completed purchase.
 * Only triggered on actual product purchases (never on wallet top-ups).
 */
async function applyReferralCommission(db, buyerUserId, saleAmount) {
  const buyer = await getUser(db, buyerUserId);
  if (!buyer.referredBy) return;
  const referrer = await getUser(db, buyer.referredBy);
  const percent = await getReferralPercentForUsername(db, referrer.username);
  const commission = Math.round(saleAmount * (percent / 100) * 100) / 100;
  if (commission <= 0) return;
  referrer.balance += commission;
  referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
  await saveUser(db, referrer);
  await addWalletHistory(db, referrer.id, { type: "referral", amount: commission, from: buyerUserId });
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
      referredBy: null,
      referralEarnings: 0,
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

/* order number generator: plain sequential number (1, 2, 3, ...), no date —
   simple to read out loud and easy for the admin to check "did order №N go through". */
async function generateOrderNumber(db) {
  const counterKey = kvKeyCounter();
  const current = await db.get(counterKey);
  const next = current ? parseInt(current, 10) + 1 : 1;
  // best-effort increment (KV has no atomic increment; acceptable for this scale)
  await db.put(counterKey, String(next));
  return String(next);
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
  await db.delete(kvKeyActivePromo(userId));
}

/* Runs once per order, regardless of HOW it was paid (wallet / bank / terminal):
   marks the "spent" total, consumes the promo code, and pays referral commission.
   Kept in one place so promo codes and referral bonuses can never be skipped for
   any particular payment method. */
async function finalizeOrderPaid(db, order) {
  await walletCommitSpend(db, order.userId, order.total, order.orderNumber);
  if (order.promoCode) await consumePromo(db, order.promoCode, order.userId);
  await applyReferralCommission(db, order.userId, order.total);
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

/* Colour-circle status label shown to the buyer in "Мои заказы" (plain text, not buttons). */
function orderStatusLabel(lang, status) {
  const map = {
    pending_payment: "status_pending_payment",
    paid: "status_paid",
    processing: "status_processing",
    completed: "status_completed",
    cancelled: "status_cancelled",
    failed: "status_failed",
    refunded: "status_refunded",
  };
  return t(lang, map[status] || "status_processing");
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

/* Chunks a flat list of buttons into rows of 2 (last row may have 1). */
function twoPerRow(buttons) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
}

function mainMenuKeyboard(lang) {
  return ikb([
    [btn(t(lang, "btn_games"), "menu:games")],
    [btn(t(lang, "btn_wallet"), "wallet:home"), btn(t(lang, "btn_orders"), "orders:list")],
    [btn(t(lang, "btn_promo"), "promo:enter"), btn(t(lang, "btn_profile"), "profile:home")],
    [btn(t(lang, "btn_referral"), "referral:home")],
    [
      { text: t(lang, "btn_reviews"), url: "https://t.me/nurtilekshop" },
      { text: t(lang, "btn_channel"), url: "https://t.me/nurtilek_shopp" },
    ],
    [
      { text: t(lang, "btn_support"), url: "https://t.me/nurt1lek_ff" },
      btn(t(lang, "btn_lang"), "lang:menu"),
    ],
  ]);
}

function gamesMenuKeyboard(lang) {
  const items = [
    btn(t(lang, "btn_freefire"), "cat:freefire"),
    btn(t(lang, "btn_pubg"), "menu:pubg"),
    btn(t(lang, "btn_mlbb"), "cat:mlbb"),
    btn(t(lang, "btn_tg"), "menu:tg"),
  ];
  const rows = twoPerRow(items);
  rows.push([btn(t(lang, "btn_home"), "menu:home")]);
  return ikb(rows);
}

function pubgMenuKeyboard(lang) {
  return ikb([
    [btn("UC", "cat:pubg_uc"), btn("Prime", "cat:pubg_prime")],
    [btn("Prime+", "cat:pubg_primeplus")],
    [btn(t(lang, "btn_back"), "menu:games")],
  ]);
}

function tgMenuKeyboard(lang) {
  return ikb([
    [btn("⭐ Stars", "cat:tg_stars"), btn("💎 Premium", "cat:tg_premium")],
    [btn(t(lang, "btn_back"), "menu:games")],
  ]);
}

/* Product buttons carry no price (per request); prices live in a separate "Цены" text screen. */
async function categoryKeyboard(db, lang, catKey) {
  const cat = CATALOG[catKey];
  if (!cat) return ikb([[btn(t(lang, "btn_back"), "menu:games")]]);
  const productButtons = cat.items.map((i) => btn(i.name, `prod:${catKey}:${i.id}`));
  const rows = twoPerRow(productButtons);
  const backTarget = catKey.startsWith("pubg_") ? "menu:pubg" : catKey.startsWith("tg_") ? "menu:tg" : "menu:games";
  if (cat.items.length > 0) rows.push([btn(t(lang, "btn_prices"), `prices:${catKey}`)]);
  rows.push([btn(t(lang, "btn_back"), backTarget)]);
  return ikb(rows);
}

/* Plain-text price list: each item on its own line, price written at the end. */
async function pricesText(db, lang, catKey) {
  const cat = CATALOG[catKey];
  if (!cat) return t(lang, "prices_title");
  const items = await getResolvedItems(db, catKey);
  const lines = [t(lang, "prices_title"), ""];
  for (const i of items) {
    lines.push(`🔹 <b>${i.name} = ${i.price} ${t(lang, "kg_som")}</b>`);
  }
  return lines.join("\n");
}

function pricesKeyboard(lang, catKey) {
  return ikb([[btn(t(lang, "btn_back"), `cat:${catKey}`)]]);
}

/* Quantity-stepper screen shown right after picking a product (max 10x). */
function qtyKeyboard(lang, catKey, itemId, qty) {
  const dec = Math.max(1, qty - 1);
  const inc = Math.min(10, qty + 1);
  return ikb([
    [btn("➖", `qty:${catKey}:${itemId}:${dec}`), btn(`${qty}`, `qty:${catKey}:${itemId}:${qty}`), btn("➕", `qty:${catKey}:${itemId}:${inc}`)],
    [btn(t(lang, "btn_qty_confirm"), `qtyok:${catKey}:${itemId}:${qty}`)],
    [btn(t(lang, "btn_back"), `cat:${catKey}`)],
  ]);
}

function qtyText(lang, item, qty) {
  return [
    item.name,
    t(lang, "qty_line", qty),
    t(lang, "qty_total_line", item.price * qty),
  ].join("\n");
}

function confirmKeyboard(lang, confirmData, cancelData) {
  return ikb([[btn(t(lang, "btn_confirm"), confirmData), btn(t(lang, "btn_cancel"), cancelData)]]);
}

function paymentMethodKeyboard(lang, orderId) {
  return ikb([
    [btn(t(lang, "btn_pay_balance"), `confirmorder:${orderId}`)],
    [btn(t(lang, "btn_pay_bank"), `payorder:bank:${orderId}`)],
    [btn(t(lang, "btn_pay_terminal"), `payorder:terminal:${orderId}`)],
    [btn(t(lang, "btn_cancel"), `cancelorder:${orderId}`)],
  ]);
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

function findItemBase(catKey, itemId) {
  const cat = CATALOG[catKey];
  if (!cat) return null;
  return cat.items.find((i) => i.id === itemId) || null;
}

/* Admin can override any catalog item's price from the admin panel (config:price:*).
   This price is used everywhere: buttons, the prices list, and the final order total. */
async function getEffectivePrice(db, catKey, itemId, basePrice) {
  const override = await db.get(kvKeyPriceOverride(catKey, itemId));
  if (override !== null && override !== undefined && override !== "") {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return basePrice;
}

async function setPriceOverride(db, catKey, itemId, price) {
  await db.put(kvKeyPriceOverride(catKey, itemId), String(price));
}

async function getEffectiveStarsPricePerStar(db) {
  const override = await db.get(kvKeyStarsPricePerStar());
  const n = override !== null ? Number(override) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return CATALOG.tg_stars.pricePerStar;
}

/* Returns an item with its price already resolved to the current (possibly admin-overridden) price. */
async function findItem(db, catKey, itemId) {
  const base = findItemBase(catKey, itemId);
  if (!base) return null;
  const price = await getEffectivePrice(db, catKey, itemId, base.price);
  return { ...base, price };
}

/* Returns every item of a category with resolved (overridden) prices, for listing/pricing screens. */
async function getResolvedItems(db, catKey) {
  const cat = CATALOG[catKey];
  if (!cat) return [];
  const out = [];
  for (const i of cat.items) {
    const price = await getEffectivePrice(db, catKey, i.id, i.price);
    out.push({ ...i, price });
  }
  return out;
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

  const [ns, a, b, c] = data.split(":");

  try {
    if (ns === "menu") {
      if (a === "home") {
        await clearState(db, userId);
        await renderMainMenu(env, db, chatId, messageId, lang);
      } else if (a === "games") {
        await editMessage(env, chatId, messageId, t(lang, "choose_category"), gamesMenuKeyboard(lang));
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

    if (ns === "prices") {
      const catKey = a;
      const text = await pricesText(db, lang, catKey);
      await editMessage(env, chatId, messageId, text, pricesKeyboard(lang, catKey));
      return answerCallback(env, cq.id);
    }

    if (ns === "prod") {
      const catKey = a;
      const itemId = b;
      const cat = CATALOG[catKey];
      const item = await findItem(db, catKey, itemId);
      if (!cat || !item) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      await editMessage(env, chatId, messageId, qtyText(lang, item, 1), qtyKeyboard(lang, catKey, itemId, 1));
      return answerCallback(env, cq.id);
    }

    if (ns === "qty") {
      const catKey = a;
      const itemId = b;
      const qty = Math.max(1, Math.min(10, parseInt(c, 10) || 1));
      const item = await findItem(db, catKey, itemId);
      if (!item) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      await editMessage(env, chatId, messageId, qtyText(lang, item, qty), qtyKeyboard(lang, catKey, itemId, qty));
      return answerCallback(env, cq.id);
    }

    if (ns === "qtyok") {
      const catKey = a;
      const itemId = b;
      const qty = Math.max(1, Math.min(10, parseInt(c, 10) || 1));
      const cat = CATALOG[catKey];
      const item = await findItem(db, catKey, itemId);
      if (!cat || !item) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      const itemName = qty > 1 ? `${item.name} × ${qty}` : item.name;
      const stateData = { catKey, itemId, itemName, price: item.price * qty, inputType: cat.inputType };
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
      await finalizeOrderPaid(db, order);

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

    if (ns === "payorder") {
      const method = a;
      const orderId = b;
      const order = await getOrder(db, orderId);
      if (!order || order.userId !== userId || order.status !== "pending_payment") {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      await answerCallback(env, cq.id);

      if (method === "bank") {
        const botInfo = await tgCall(env, "getMe", {});
        const redirectUrl =
          botInfo.ok && botInfo.result.username ? `https://t.me/${botInfo.result.username}` : env.APP_BASE_URL;
        const payment = await createFinikPayment(env, {
          amount: order.total,
          paymentId: order.internalId,
          redirectUrl,
          description: `Nurtilek Shop order ${order.orderNumber}`,
          lang,
        });
        if (!payment.ok) {
          await sendMessage(env, chatId, t(lang, "service_unavailable"), backHomeKeyboard(lang));
          return;
        }
        await sendMessage(env, chatId, `№ ${order.orderNumber} — ${order.total} ${t(lang, "kg_som")}`, {
          inline_keyboard: [
            [{ text: "💳 Оплатить", url: payment.paymentUrl }],
            [{ text: t(lang, "btn_home"), callback_data: "menu:home" }],
          ],
        });
        return;
      }

      if (method === "terminal") {
        const uidLines = Object.entries(order.uidData)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        const messageText = [
          `Здравствуйте! Хочу оформить заказ Nurtilek Shop.`,
          `Заказ: ${order.orderNumber}`,
          `Товар: ${order.itemName}`,
          `Сумма: ${order.total} ${t(lang, "kg_som")}`,
          uidLines,
        ].join("\n");

        await sendMessage(env, chatId, t(lang, "terminal_instructions"), {
          inline_keyboard: [
            [{ text: t(lang, "terminal_dm_button"), url: `https://t.me/${env.ADMIN_USERNAME}?text=${encodeURIComponent(messageText)}` }],
            [{ text: t(lang, "btn_home"), callback_data: "menu:home" }],
          ],
        });

        await sendMessage(
          env,
          env.ADMIN_ID,
          `🧾 Заказ ожидает оплаты через терминал\n№ ${order.orderNumber}\n${order.itemName}\nСумма: ${order.total} ${t(lang, "kg_som")}\nUser: ${userId} (@${user.username || "-"})\n${uidLines}`,
          ikb([[btn("✅ Оплата получена", `admin:orderpayok:${order.internalId}`)]])
        );
        return;
      }
      return;
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

    if (ns === "referral") {
      const u = await getUser(db, userId);
      const percent = await getReferralPercentForUsername(db, u.username);
      const template = await getReferralText(db, lang);
      const description = template.replace(/\{percent\}/g, String(percent));
      const botInfo = await tgCall(env, "getMe", {});
      const refLink =
        botInfo.ok && botInfo.result.username
          ? `https://t.me/${botInfo.result.username}?start=ref_${userId}`
          : "—";
      const text = [
        description,
        "",
        t(lang, "referral_rate_line", percent),
        `${t(lang, "referral_link_label")}:\n${refLink}`,
        `${t(lang, "referral_earned_label")}: ${u.referralEarnings || 0} ${t(lang, "kg_som")}`,
      ].join("\n");
      await editMessage(env, chatId, messageId, text, backHomeKeyboard(lang));
      return answerCallback(env, cq.id);
    }

    if (ns === "orders") {
      if (a === "list") {
        const orderIds = (await getJSON(db, kvKeyUserOrders(userId), [])) || [];
        if (orderIds.length === 0) {
          await editMessage(env, chatId, messageId, t(lang, "orders_empty"), backHomeKeyboard(lang));
          return answerCallback(env, cq.id);
        }
        // Plain text, not buttons — every order is readable at a glance,
        // with a colour circle for its status (🔴 отменён, 🟡 в обработке, 🟢 выполнен).
        const lines = [t(lang, "orders_title"), ""];
        for (const id of orderIds.slice(0, 20)) {
          const o = await getOrder(db, id);
          if (!o) continue;
          lines.push(`№ ${o.orderNumber}`);
          lines.push(`${o.itemName} — ${o.total} ${t(lang, "kg_som")}`);
          lines.push(orderStatusLabel(lang, o.status));
          lines.push("");
        }
        await editMessage(env, chatId, messageId, lines.join("\n").trim(), backHomeKeyboard(lang));
      }
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

    if (ns === "admin") {
      return handleAdminCallback(env, db, cq, a, b, c, lang);
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
    const completedText = [
      t(lang, "completed"),
      `№ ${order.orderNumber}`,
      order.itemName,
      "",
      t(lang, "order_completed_review_hint"),
    ].join("\n");
    await sendMessage(env, user.id, completedText, {
      inline_keyboard: [
        [{ text: t(lang, "btn_leave_review"), url: "https://t.me/nurtilekshop" }],
        [{ text: t(lang, "btn_home"), callback_data: "menu:home" }],
      ],
    });
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
  // The active promo code is kept in its own KV key (not in the step-machine state),
  // so it survives moving between menus/categories while the user picks a product.
  const activeCode = await db.get(kvKeyActivePromo(userId));
  if (activeCode) {
    const check = await validatePromo(db, activeCode, userId, price);
    if (check.ok) {
      discount = check.discount;
      promoCode = activeCode;
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

  const existingUserRecord = await getJSON(db, kvKeyUser(userId));
  const isNewUser = !existingUserRecord;

  const user = await getUser(db, userId);
  if (msg.from.username) user.username = msg.from.username;
  await saveUser(db, user);
  const lang = user.lang || "ru";

  if (text.startsWith("/start")) {
    await clearState(db, userId);
    if (isNewUser) {
      const payload = text.slice(6).trim();
      if (payload.startsWith("ref_")) {
        const refId = payload.slice(4).trim();
        if (refId && String(refId) !== String(userId)) {
          user.referredBy = refId;
          await saveUser(db, user);
        }
      }
    }
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
    await sendMessage(env, chatId, `№ ${order.orderNumber}
${prompt.text}

${t(lang, "choose_payment_method")}`, paymentMethodKeyboard(lang, order.internalId));
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
    await sendMessage(env, chatId, `№ ${order.orderNumber}
${prompt.text}

${t(lang, "choose_payment_method")}`, paymentMethodKeyboard(lang, order.internalId));
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
    const pricePerStar = await getEffectiveStarsPricePerStar(db);
    const price = Math.round(amount * pricePerStar);
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
    await sendMessage(env, chatId, `№ ${order.orderNumber}
${prompt.text}

${t(lang, "choose_payment_method")}`, paymentMethodKeyboard(lang, order.internalId));
    return;
  }

  if (state.step === "await_promo_code") {
    await clearState(db, userId);
    const check = await validatePromo(db, text, userId, 0);
    if (!check.ok) {
      await sendMessage(env, chatId, t(lang, "promo_invalid"), backHomeKeyboard(lang));
      return;
    }
    // Stored separately from the step-machine state so it isn't lost when the
    // user goes on to browse categories/products before checking out.
    await db.put(kvKeyActivePromo(userId), text.toUpperCase());
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

    const botInfo = await tgCall(env, "getMe", {});
    const redirectUrl = botInfo.ok && botInfo.result.username
      ? `https://t.me/${botInfo.result.username}`
      : env.APP_BASE_URL;

    const payment = await createFinikPayment(env, {
      amount,
      paymentId: topupId,
      redirectUrl,
      description: `Nurtilek Shop top-up ${topupId}`,
      lang,
    });

    if (!payment.ok) {
      await sendMessage(env, chatId, t(lang, "service_unavailable"), backHomeKeyboard(lang));
      return;
    }

    await sendMessage(env, chatId, `${amount} ${t(lang, "kg_som")}`, {
      inline_keyboard: [
        [{ text: "💳 Оплатить", url: payment.paymentUrl }],
        [{ text: t(lang, "btn_home"), callback_data: "menu:home" }],
      ],
    });
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
    [btn("🎮 Каталог и цены", "admin:catalog"), btn("🎟 Промокоды", "admin:promos")],
    [btn("🤝 Рефералка", "admin:referral")],
    [btn("📢 Рассылка", "admin:broadcast"), btn("💳 Баланс Donix", "admin:donixbalance")],
    [btn("🛠 Настройки", "admin:settings"), btn("📋 Логи", "admin:logs")],
    [btn("🏠 Главное меню", "menu:home")],
  ]);
}

const CATALOG_LABELS = {
  freefire: "Free Fire",
  pubg_uc: "PUBG — UC",
  pubg_prime: "PUBG — Prime",
  pubg_primeplus: "PUBG — Prime+",
  mlbb: "Mobile Legends",
  tg_stars: "Telegram Stars",
  tg_premium: "Telegram Premium",
};

function adminCatalogListKeyboard() {
  const rows = Object.keys(CATALOG).map((key) => [btn(CATALOG_LABELS[key] || key, `admin:catcat:${key}`)]);
  rows.push([btn("⬅️", "admin:home")]);
  return ikb(rows);
}

async function adminCategoryItemsView(db, catKey) {
  if (catKey === "tg_stars") {
    const perStar = await getEffectiveStarsPricePerStar(db);
    return {
      text: `💎 Telegram Stars\nТекущая цена за 1 звезду: ${perStar} сом\n\nМинимум: ${CATALOG.tg_stars.min}, максимум: ${CATALOG.tg_stars.max}.`,
      keyboard: ikb([
        [btn(`✏️ Изменить цену за звезду (${perStar})`, "admin:catitem:tg_stars:__perstar")],
        [btn("⬅️", "admin:catalog")],
      ]),
    };
  }
  const items = await getResolvedItems(db, catKey);
  const rows = items.map((i) => [btn(`${i.name} — ${i.price} сом`, `admin:catitem:${catKey}:${i.id}`)]);
  rows.push([btn("⬅️", "admin:catalog")]);
  return { text: `${CATALOG_LABELS[catKey] || catKey}\nВыберите товар, чтобы изменить его цену:`, keyboard: ikb(rows) };
}

async function handleAdminCallback(env, db, cq, a, b, c, lang) {
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const userId = cq.from.id;

  if (!isAdmin(env, userId)) {
    await answerCallback(env, cq.id, t(lang, "admin_only"), true);
    return;
  }

  if (a === "stats") {
    const orderKeys = await db.list({ prefix: "order:" });
    const userKeys = await db.list({ prefix: "user:" });
    let completed = 0;
    let totalRevenue = 0;
    for (const k of orderKeys.keys) {
      const o = await getJSON(db, k.name);
      if (o && (o.status === "paid" || o.status === "processing" || o.status === "completed")) {
        completed++;
        totalRevenue += o.total || 0;
      }
    }
    const text = [
      "📊 Статистика",
      `Всего пользователей: ${userKeys.keys.length}`,
      `Всего заказов: ${orderKeys.keys.length}`,
      `Оплаченных заказов: ${completed}`,
      `Общая сумма оплаченных заказов: ${totalRevenue} сом`,
    ].join("\n");
    await editMessage(env, chatId, messageId, text, ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "home") {
    await editMessage(env, chatId, messageId, t(lang, "admin_panel"), adminMainKeyboard());
  } else if (a === "donixbalance") {
    const res = await donixBalance(env);
    const text = res.ok ? `💳 Баланс Donix: ${JSON.stringify(res.data)}` : t(lang, "service_unavailable");
    await editMessage(env, chatId, messageId, text, ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "promos") {
    await setState(db, userId, { step: "admin_create_promo", data: {} });
    await editMessage(env, chatId, messageId, t(lang, "promo_admin_create_hint"), ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "catalog") {
    await clearState(db, userId);
    await editMessage(
      env,
      chatId,
      messageId,
      "🎮 Каталог и цены\nВыберите раздел, чтобы посмотреть и изменить цены товаров:",
      adminCatalogListKeyboard()
    );
  } else if (a === "catcat") {
    const catKey = b;
    if (!CATALOG[catKey]) {
      await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
      return;
    }
    await clearState(db, userId);
    const view = await adminCategoryItemsView(db, catKey);
    await editMessage(env, chatId, messageId, view.text, view.keyboard);
  } else if (a === "catitem") {
    const catKey = b;
    const itemId = c;
    if (catKey === "tg_stars" && itemId === "__perstar") {
      await setState(db, userId, { step: "admin_set_starprice", data: {} });
      await editMessage(
        env,
        chatId,
        messageId,
        "Отправьте новую цену за 1 звезду (сом), например: 1.8",
        ikb([[btn("⬅️", "admin:catcat:tg_stars")]])
      );
      return answerCallback(env, cq.id);
    }
    const base = findItemBase(catKey, itemId);
    if (!base) {
      await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
      return;
    }
    const current = await getEffectivePrice(db, catKey, itemId, base.price);
    await setState(db, userId, { step: "admin_set_price", data: { catKey, itemId } });
    await editMessage(
      env,
      chatId,
      messageId,
      `${base.name}\nТекущая цена: ${current} сом\n\nОтправьте новую цену (только число, в сомах):`,
      ikb([[btn("⬅️", `admin:catcat:${catKey}`)]])
    );
  } else if (a === "broadcast") {
    await setState(db, userId, { step: "admin_broadcast", data: {} });
    await editMessage(env, chatId, messageId, "Отправьте текст рассылки:", ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "orders") {
    const orderKeys = await db.list({ prefix: "order:" });
    const recent = orderKeys.keys.slice(-15).reverse();
    const lines = ["📦 Последние заказы:"];
    for (const k of recent) {
      const o = await getJSON(db, k.name);
      if (o) lines.push(`№ ${o.orderNumber} — ${o.itemName} — ${o.total} сом — ${o.status}`);
    }
    if (recent.length === 0) lines.push("Пока нет заказов.");
    await editMessage(env, chatId, messageId, lines.join("\n"), ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "users") {
    const userKeys = await db.list({ prefix: "user:" });
    const recent = userKeys.keys.slice(-15).reverse();
    const lines = [`👥 Пользователей всего: ${userKeys.keys.length}`, "Последние:"];
    for (const k of recent) {
      const u = await getJSON(db, k.name);
      if (u) lines.push(`${u.id} @${u.username || "-"} — баланс ${u.balance} сом`);
    }
    await editMessage(env, chatId, messageId, lines.join("\n"), ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "wallets") {
    const userKeys = await db.list({ prefix: "user:" });
    const users = [];
    for (const k of userKeys.keys) {
      const u = await getJSON(db, k.name);
      if (u) users.push(u);
    }
    users.sort((x, y) => (y.balance || 0) - (x.balance || 0));
    const lines = ["💰 Кошельки (топ по балансу):"];
    for (const u of users.slice(0, 15)) {
      lines.push(`${u.id} @${u.username || "-"} — ${u.balance} сом (потрачено: ${u.spent || 0} сом)`);
    }
    if (users.length === 0) lines.push("Пока нет пользователей.");
    await editMessage(env, chatId, messageId, lines.join("\n"), ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "settings" || a === "logs") {
    await editMessage(
      env,
      chatId,
      messageId,
      "Этот раздел пока не настроен отдельно. Используйте «Каталог и цены» для цен, «Рефералка» для процента, «Промокоды» для скидок.",
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
  } else if (a === "orderpayok") {
    const orderId = b;
    const order = await getOrder(db, orderId);
    if (!order || order.status !== "pending_payment") {
      await answerCallback(env, cq.id);
      return;
    }
    const first = await idempotentOnce(db, "orderpayconfirm", orderId);
    if (!first) {
      await answerCallback(env, cq.id);
      return;
    }
    order.status = "paid";
    order.paymentMethod = "terminal";
    await saveOrder(db, order);
    await finalizeOrderPaid(db, order);

    const buyer = await getUser(db, order.userId);
    const buyerLang = buyer.lang || "ru";
    await sendMessage(
      env,
      order.userId,
      `${t(buyerLang, "order_created", order.orderNumber)}\n${t(buyerLang, "processing")}`,
      backHomeKeyboard(buyerLang)
    );
    await editMessage(env, chatId, messageId, `✅ Оплата по заказу ${order.orderNumber} подтверждена.`, null);
    await processDonixOrder(env, db, order, buyerLang, order.userId);
  } else if (a === "referral") {
    const percent = await db.get(kvKeyConfig("referral_percent"));
    const textTpl = await db.get(kvKeyConfig("referral_text"));
    await editMessage(
      env,
      chatId,
      messageId,
      `🤝 Реферальная программа\nТекущий процент по умолчанию: ${percent || DEFAULT_REFERRAL_PERCENT}%\nТекст: ${
        textTpl || "(стандартный)"
      }`,
      ikb([
        [btn("✏️ Изменить процент", "admin:refpercent")],
        [btn("✏️ Изменить текст", "admin:reftext")],
        [btn("👤 Процент для юзера", "admin:refcustom")],
        [btn("⬅️", "admin:home")],
      ])
    );
  } else if (a === "refpercent") {
    await setState(db, userId, { step: "admin_referral_percent", data: {} });
    await editMessage(env, chatId, messageId, "Отправьте новый процент по умолчанию, например: 0.5", ikb([[btn("⬅️", "admin:referral")]]));
  } else if (a === "reftext") {
    await setState(db, userId, { step: "admin_referral_text", data: {} });
    await editMessage(
      env,
      chatId,
      messageId,
      "Отправьте новый текст программы. Используйте {percent} — он подставится автоматически.",
      ikb([[btn("⬅️", "admin:referral")]])
    );
  } else if (a === "refcustom") {
    await setState(db, userId, { step: "admin_referral_custom", data: {} });
    await editMessage(
      env,
      chatId,
      messageId,
      "Отправьте: username;процент\nПример: nurt1lek_ff;1.5",
      ikb([[btn("⬅️", "admin:referral")]])
    );
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

  if (state.step === "admin_set_price") {
    const value = Number(text.replace(",", "."));
    const { catKey, itemId } = state.data;
    const base = findItemBase(catKey, itemId);
    if (!Number.isFinite(value) || value < 0 || !base) {
      await sendMessage(env, chatId, "Неверная цена. Отправьте число, например: 85");
      return;
    }
    await setPriceOverride(db, catKey, itemId, value);
    await clearState(db, userId);
    await sendMessage(
      env,
      chatId,
      `✅ Новая цена «${base.name}»: ${value} сом.\nЭта цена сразу применяется для всех покупателей.`,
      adminMainKeyboard()
    );
    return;
  }

  if (state.step === "admin_set_starprice") {
    const value = Number(text.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      await sendMessage(env, chatId, "Неверная цена. Отправьте число, например: 1.8");
      return;
    }
    await db.put(kvKeyStarsPricePerStar(), String(value));
    await clearState(db, userId);
    await sendMessage(env, chatId, `✅ Новая цена за 1 звезду: ${value} сом.`, adminMainKeyboard());
    return;
  }

  if (state.step === "admin_referral_percent") {
    const value = parseFloat(text.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      await sendMessage(env, chatId, "Неверное число. Пример: 0.5");
      return;
    }
    await db.put(kvKeyConfig("referral_percent"), String(value));
    await clearState(db, userId);
    await sendMessage(env, chatId, `✅ Процент по умолчанию: ${value}%`, adminMainKeyboard());
    return;
  }

  if (state.step === "admin_referral_text") {
    await db.put(kvKeyConfig("referral_text"), text);
    await clearState(db, userId);
    await sendMessage(env, chatId, "✅ Текст программы обновлён.", adminMainKeyboard());
    return;
  }

  if (state.step === "admin_referral_custom") {
    const parts = text.split(";").map((p) => p.trim());
    const uname = (parts[0] || "").replace(/^@/, "");
    const value = parseFloat((parts[1] || "").replace(",", "."));
    if (!uname || !Number.isFinite(value) || value < 0) {
      await sendMessage(env, chatId, "Неверный формат. Пример: nurt1lek_ff;1.5");
      return;
    }
    await db.put(kvKeyReferralOverride(uname), String(value));
    await clearState(db, userId);
    await sendMessage(env, chatId, `✅ Для @${uname} установлен процент: ${value}%`, adminMainKeyboard());
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
  const url = new URL(request.url);
  const rawBody = await request.text();

  const isValid = await verifyFinikWebhookSignature(env, request, rawBody, url);
  if (!isValid) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  // Finik only sends this webhook on a SUCCESSFUL payment (see docs).
  const transactionId = payload.transactionId || payload.id;
  const status = (payload.status || "").toLowerCase();
  const paymentId = payload.fields && payload.fields.paymentId;

  if (!transactionId || !paymentId) {
    return new Response("ok", { status: 200 }); // nothing to do, ack anyway
  }

  // NOTE: keyed on paymentId (our own unique id per order/top-up), NOT on transactionId.
  // In Finik's beta/sandbox environment transactionId is not guaranteed unique across
  // separate payments, which was silently swallowing every top-up after the first one.
  const first = await idempotentOnce(db, "finikwebhook", paymentId);
  if (!first) return new Response("ok", { status: 200 }); // already processed (retry-safe)

  if (status !== "success" && status !== "succeeded") {
    return new Response("ok", { status: 200 });
  }

  // paymentId may refer to either a direct order payment or a wallet top-up.
  const order = await getOrder(db, paymentId);
  if (order) {
    if (order.status !== "pending_payment") {
      return new Response("ok", { status: 200 }); // already processed
    }
    order.status = "paid";
    order.paymentMethod = "bank";
    order.transactionId = transactionId;
    await saveOrder(db, order);
    await finalizeOrderPaid(db, order);

    const buyer = await getUser(db, order.userId);
    const buyerLang = buyer.lang || "ru";
    await sendMessage(
      env,
      order.userId,
      `${t(buyerLang, "order_created", order.orderNumber)}\n${t(buyerLang, "processing")}`,
      backHomeKeyboard(buyerLang)
    );
    await processDonixOrder(env, db, order, buyerLang, order.userId);
    return new Response("ok", { status: 200 });
  }

  const topup = await getJSON(db, `topup:${paymentId}`);
  if (!topup) {
    console.log("Finik webhook: unknown paymentId", paymentId);
    return new Response("ok", { status: 200 });
  }
  if (topup.status === "confirmed") {
    return new Response("ok", { status: 200 }); // already credited
  }

  topup.status = "confirmed";
  topup.transactionId = transactionId;
  await putJSON(db, `topup:${paymentId}`, topup);

  // Wallet top-ups never earn referral commission — only actual purchases do.
  await walletTopUpCredit(db, topup.userId, topup.amount, `finik:${transactionId}`);

  const user = await getUser(db, topup.userId);
  const lang = user.lang || "ru";
  await sendMessage(
    env,
    topup.userId,
    `✅ ${t(lang, "wallet_topup")}: +${topup.amount} ${t(lang, "kg_som")}`,
    backHomeKeyboard(lang)
  );

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
