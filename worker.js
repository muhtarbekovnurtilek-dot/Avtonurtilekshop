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
    cart_title: "🛒 Товары",
    cart_empty: "Товары не выбраны",
    btn_cart_next: "✅ Далее",
    btn_cart_reset: (s) => `🔄 Сброс • ${s} сом`,
    cart_max_reached: "❌ Максимум 10 шт. этого товара.",
    cart_choose_at_least_one: "❌ Выберите хотя бы один товар.",
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
    cart_title: "🛒 Товарлар",
    cart_empty: "Товарлар тандалган жок",
    btn_cart_next: "✅ Кийинки",
    btn_cart_reset: (s) => `🔄 Тазалоо • ${s} сом`,
    cart_max_reached: "❌ Бул товардан макс. 10 даана.",
    cart_choose_at_least_one: "❌ Жок дегенде бир товар тандаңыз.",
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

/* Human-readable label for a wallet history entry ("📜 История"), by entry.type. */
const WALLET_HISTORY_LABELS = {
  ru: {
    topup: "➕ Пополнение",
    purchase: "🛒 Потрачено",
    refund: "💸 Возврат средств",
    referral: "🤝 Реферальный бонус",
  },
  kg: {
    topup: "➕ Толуктоо",
    purchase: "🛒 Коротулду",
    refund: "💸 Каражат кайтарылды",
    referral: "🤝 Реферал бонусу",
  },
};
function walletHistoryTypeLabel(lang, type) {
  const table = WALLET_HISTORY_LABELS[lang] || WALLET_HISTORY_LABELS.ru;
  return table[type] || WALLET_HISTORY_LABELS.ru[type] || type;
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
function kvKeyCart(userId) {
  return `cart:${userId}`;
}
function kvKeyBalanceHistory(userId) {
  return `balancehistory:${userId}`;
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

/* ================= CART (multi-item basket per category) ================= */
/* Shape: { catKey, items: { [itemId]: qty } } — one active cart per user at a time.
   Switching to a different category starts a fresh cart. */
async function getCart(db, userId) {
  return await getJSON(db, kvKeyCart(userId));
}
async function saveCart(db, userId, cart) {
  await putJSON(db, kvKeyCart(userId), cart);
}
async function clearCart(db, userId) {
  await db.delete(kvKeyCart(userId));
}
function cartTotal(cart, resolvedItems) {
  if (!cart) return 0;
  let sum = 0;
  for (const item of resolvedItems) {
    const qty = cart.items[item.id] || 0;
    sum += item.price * qty;
  }
  return sum;
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

/* ================= ADMIN BALANCE ADJUSTMENTS ================= */

/* Records every manual admin top-up/deduction, distinct from the buyer-facing wallet
   history: keeps the Telegram ID, amount, type, before/after balance, timestamp and
   which admin performed it. */
async function addAdminBalanceHistory(db, userId, entry) {
  const key = kvKeyBalanceHistory(userId);
  const list = (await getJSON(db, key, [])) || [];
  list.unshift({ ...entry, userId, at: new Date().toISOString() });
  if (list.length > 100) list.length = 100;
  await putJSON(db, key, list);
}

/* Admin-initiated balance top-up: no floor beyond 0, always allowed. */
async function adminTopUpBalance(db, adminId, userId, amount) {
  const user = await getUser(db, userId);
  const oldBalance = user.balance;
  user.balance = oldBalance + amount;
  await saveUser(db, user);
  await addAdminBalanceHistory(db, userId, { amount, type: "topup", oldBalance, newBalance: user.balance, adminId });
  return { oldBalance, newBalance: user.balance };
}

/* Admin-initiated deduction: rejected if it would take the balance below 0. */
async function adminDeductBalance(db, adminId, userId, amount) {
  const user = await getUser(db, userId);
  if (amount > user.balance) return { ok: false, balance: user.balance };
  const oldBalance = user.balance;
  user.balance = oldBalance - amount;
  await saveUser(db, user);
  await addAdminBalanceHistory(db, userId, { amount, type: "deduct", oldBalance, newBalance: user.balance, adminId });
  return { ok: true, oldBalance, newBalance: user.balance };
}

/* ================= PROMO CODES ================= */

async function createPromo(db, spec) {
  // spec: {code, type: 'percent'|'fixed', value, uses, days, minSum, firstPurchaseOnly, onePerUser}
  // uses: null/undefined/Infinity means unlimited total redemptions (usesLeft stored as null).
  // days: null/undefined means it never expires ("вечный" promo code).
  const unlimitedUses = spec.uses === null || spec.uses === undefined || spec.uses === Infinity;
  const promo = {
    code: spec.code.toUpperCase(),
    type: spec.type,
    value: Number(spec.value),
    usesLeft: unlimitedUses ? null : Number(spec.uses) || 0,
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
  // usesLeft === null means unlimited total redemptions (only onePerUser limits a given account).
  if (promo.usesLeft !== null && promo.usesLeft <= 0) return { ok: false, reason: "exhausted" };
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
  if (promo.usesLeft !== null) {
    promo.usesLeft = Math.max(0, promo.usesLeft - 1);
    await putJSON(db, kvKeyPromo(code), promo);
  }
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
  // params: userId, category, itemId, itemName, price, discount, total, uidData, promoCode, items (optional cart lines)
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
    // Multiple distinct products bought together from the cart, each with its own
    // qty/price/fulfilment status. Absent for legacy single-item orders.
    items: params.items && params.items.length > 0
      ? params.items.map((l) => ({ itemId: l.itemId, name: l.name, qty: l.qty, price: l.price, status: "pending", donixOrderId: null }))
      : undefined,
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

function mainMenuKeyboard(lang, env) {
  const gamesButton =
    env && env.APP_BASE_URL
      ? { text: t(lang, "btn_games"), web_app: { url: `${env.APP_BASE_URL}/webapp` } }
      : btn(t(lang, "btn_games"), "menu:games"); // fallback to the old text menu if no base URL is configured
  return ikb([
    [gamesButton],
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

function categoryBackTarget(catKey) {
  return catKey.startsWith("pubg_") ? "menu:pubg" : catKey.startsWith("tg_") ? "menu:tg" : "menu:games";
}

/* Cart-style product screen: tapping a product adds one unit of it to the basket
   (max 10 of each). A reset button always shows the running total; a "Далее" button
   appears once at least one item is selected, to proceed to checkout. */
async function cartKeyboard(db, lang, catKey, cart) {
  const cat = CATALOG[catKey];
  if (!cat) return ikb([[btn(t(lang, "btn_back"), "menu:games")]]);
  const resolvedItems = await getResolvedItems(db, catKey);
  const items = cart && cart.catKey === catKey ? cart.items : {};
  const productButtons = resolvedItems.map((i) => {
    const qty = items[i.id] || 0;
    const label = qty > 0 ? `${i.name} ×${qty}` : i.name;
    return btn(label, `cartadd:${catKey}:${i.id}`);
  });
  const rows = twoPerRow(productButtons);
  const backTarget = categoryBackTarget(catKey);
  if (resolvedItems.length > 0) rows.push([btn(t(lang, "btn_prices"), `prices:${catKey}`)]);
  const total = cartTotal(cart && cart.catKey === catKey ? cart : null, resolvedItems);
  if (total > 0) rows.push([btn(t(lang, "btn_cart_next"), `cartnext:${catKey}`)]);
  rows.push([btn(t(lang, "btn_cart_reset", total), `cartreset:${catKey}`)]);
  rows.push([btn(t(lang, "btn_back"), backTarget)]);
  return ikb(rows);
}

/* Text shown above the cart keyboard: prompt + a compact summary line of what's selected. */
async function cartText(db, lang, catKey, cart) {
  const resolvedItems = await getResolvedItems(db, catKey);
  const items = cart && cart.catKey === catKey ? cart.items : {};
  const byId = Object.fromEntries(resolvedItems.map((i) => [i.id, i]));
  const parts = [];
  for (const id of Object.keys(items)) {
    const qty = items[id];
    const item = byId[id];
    if (item && qty > 0) parts.push(`${item.name} ×${qty}`);
  }
  const summary = parts.length > 0 ? parts.join("     ") : t(lang, "cart_empty");
  return [t(lang, "choose_product"), "", t(lang, "cart_title"), "", summary].join("\n");
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
  if (messageId) return editMessage(env, chatId, messageId, text, mainMenuKeyboard(lang, env));
  return sendMessage(env, chatId, text, mainMenuKeyboard(lang, env));
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
  // BUGFIX: this used to unconditionally re-save the full user record on every single
  // button tap. getUser/saveUser is a read-modify-write over the whole KV record (not an
  // atomic increment), so if a payment webhook credited the balance (getUser -> balance
  // += amount -> saveUser) in between this handler's own read and write, this handler
  // would blindly overwrite it with the stale, pre-credit balance — silently reverting a
  // top-up back down, while the wallet history entry (written first inside the webhook)
  // stayed intact. That's exactly why balance sometimes didn't update even though history
  // showed the payment, and why reloading/tapping around didn't help — every tap was
  // itself another chance to clobber the credit. Now we only write back when something in
  // this handler actually changed.
  if (cq.from.username && cq.from.username !== user.username) {
    user.username = cq.from.username;
    await saveUser(db, user);
  }
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
      let cart = await getCart(db, userId);
      if (!cart || cart.catKey !== catKey) {
        cart = { catKey, items: {} };
        await saveCart(db, userId, cart);
      }
      const kb = await cartKeyboard(db, lang, catKey, cart);
      const text = await cartText(db, lang, catKey, cart);
      await editMessage(env, chatId, messageId, text, kb);
      return answerCallback(env, cq.id);
    }

    if (ns === "prices") {
      const catKey = a;
      const text = await pricesText(db, lang, catKey);
      await editMessage(env, chatId, messageId, text, pricesKeyboard(lang, catKey));
      return answerCallback(env, cq.id);
    }

    if (ns === "cartadd") {
      const catKey = a;
      const itemId = b;
      const cat = CATALOG[catKey];
      const item = await findItem(db, catKey, itemId);
      if (!cat || !item) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      let cart = await getCart(db, userId);
      if (!cart || cart.catKey !== catKey) cart = { catKey, items: {} };
      const cur = cart.items[itemId] || 0;
      if (cur >= 10) {
        await answerCallback(env, cq.id, t(lang, "cart_max_reached"), true);
        return;
      }
      cart.items[itemId] = cur + 1;
      await saveCart(db, userId, cart);
      const kb = await cartKeyboard(db, lang, catKey, cart);
      const text = await cartText(db, lang, catKey, cart);
      await editMessage(env, chatId, messageId, text, kb);
      return answerCallback(env, cq.id);
    }

    if (ns === "cartreset") {
      const catKey = a;
      const cart = { catKey, items: {} };
      await saveCart(db, userId, cart);
      const kb = await cartKeyboard(db, lang, catKey, cart);
      const text = await cartText(db, lang, catKey, cart);
      await editMessage(env, chatId, messageId, text, kb);
      return answerCallback(env, cq.id);
    }

    if (ns === "cartnext") {
      const catKey = a;
      const cat = CATALOG[catKey];
      const cart = await getCart(db, userId);
      if (!cat || !cart || cart.catKey !== catKey) {
        await answerCallback(env, cq.id, t(lang, "invalid_input"), true);
        return;
      }
      const resolvedItems = await getResolvedItems(db, catKey);
      const byId = Object.fromEntries(resolvedItems.map((i) => [i.id, i]));
      const lines = [];
      let total = 0;
      for (const itemId of Object.keys(cart.items)) {
        const qty = cart.items[itemId];
        const item = byId[itemId];
        if (!item || qty <= 0) continue;
        lines.push({ itemId, name: item.name, qty, price: item.price, lineTotal: item.price * qty });
        total += item.price * qty;
      }
      if (lines.length === 0) {
        await answerCallback(env, cq.id, t(lang, "cart_choose_at_least_one"), true);
        return;
      }
      const itemName = lines.map((l) => (l.qty > 1 ? `${l.name} × ${l.qty}` : l.name)).join(", ");
      const stateData = {
        catKey,
        itemId: lines.map((l) => l.itemId).join("+"),
        itemName,
        price: total,
        inputType: cat.inputType,
        items: lines,
      };
      if (cat.inputType === "ml_id") {
        await setState(db, userId, { step: "await_ml_player", data: stateData });
        await editMessage(env, chatId, messageId, t(lang, "enter_player_id_mlbb"), backHomeKeyboard(lang));
      } else {
        await setState(db, userId, { step: "await_uid", data: stateData });
        const promptKey = inputPromptKey(cat.inputType, null);
        await editMessage(env, chatId, messageId, t(lang, promptKey), backHomeKeyboard(lang));
      }
      await clearCart(db, userId);
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
            .map((h) => {
              const sign = h.type === "topup" || h.type === "refund" || h.type === "referral" ? "+" : "−";
              return `${h.at.slice(0, 10)} — ${walletHistoryTypeLabel(lang, h.type)} — ${sign}${h.amount} ${t(lang, "kg_som")}`;
            })
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

  // Cart orders bundle several distinct products together — Donix takes one product
  // per order call, so create one call per cart line, each with its own external id.
  if (order.items && order.items.length > 0) {
    const results = [];
    for (const line of order.items) {
      const payload = {
        external_id: `${order.internalId}::${line.itemId}`,
        order_number: order.orderNumber,
        category: donixCategory,
        product_id: line.itemId,
        quantity: line.qty,
        target: order.uidData,
      };
      results.push(await donixCreateOrder(env, payload));
    }

    if (results.some((r) => !r.ok || !r.data)) {
      order.status = "failed";
      order.items.forEach((line) => (line.status = "failed"));
      await saveOrder(db, order);
      const refundOk = await idempotentOnce(db, "refund", order.internalId);
      if (refundOk) await walletRelease(db, order.userId, order.total, `order_failed:${order.orderNumber}`);
      await sendMessage(env, chatId, t(lang, "failed"), backHomeKeyboard(lang));
      return;
    }

    order.items.forEach((line, idx) => {
      line.donixOrderId = results[idx].data.id || results[idx].data.order_id || null;
      line.status = "processing";
    });
    order.status = "processing";
    await saveOrder(db, order);
    await sendMessage(env, chatId, t(lang, "processing"), backHomeKeyboard(lang));
    return;
  }

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
  // Cart (multi-item) orders send one Donix order per line, tagged "<internalId>::<itemId>".
  let order = await getOrder(db, externalId);
  let cartLine = null;
  if (!order && externalId.includes("::")) {
    const [baseId, lineItemId] = externalId.split("::");
    order = await getOrder(db, baseId);
    if (order && order.items) cartLine = order.items.find((l) => l.itemId === lineItemId) || null;
  }
  if (!order) return;

  const idempKey = `${externalId}:${status}`;
  const first = await idempotentOnce(db, "donixstatus", idempKey);
  if (!first) return; // already processed this exact status transition

  const user = await getUser(db, order.userId);
  const lang = user.lang || "ru";

  if (cartLine) {
    return handleCartLineStatusUpdate(env, db, order, cartLine, status, user, lang);
  }

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

/* Updates the status of a single cart line inside a multi-item order, refunds just that
   line's amount if it fails/gets refunded, and finalizes the order once every line has
   reached a terminal state (completed/failed/refunded). */
async function handleCartLineStatusUpdate(env, db, order, cartLine, status, user, lang) {
  if (status === "processing") {
    cartLine.status = "processing";
    if (order.status !== "processing" && order.status !== "completed" && order.status !== "failed") {
      order.status = "processing";
      await sendMessage(env, user.id, t(lang, "processing"), backHomeKeyboard(lang));
    }
    await saveOrder(db, order);
    return;
  }

  if (status === "failed" || status === "refunded") {
    cartLine.status = status;
    const refundOk = await idempotentOnce(db, "refund", `${order.internalId}::${cartLine.itemId}`);
    if (refundOk) {
      await walletRelease(db, order.userId, cartLine.price * cartLine.qty, `donix_${status}:${order.orderNumber}:${cartLine.itemId}`);
    }
  } else if (status === "completed") {
    cartLine.status = "completed";
  }

  const allDone = order.items.every((l) => ["completed", "failed", "refunded"].includes(l.status));
  if (allDone) {
    const anyIssue = order.items.some((l) => l.status === "failed" || l.status === "refunded");
    order.status = anyIssue ? "failed" : "completed";
    await saveOrder(db, order);
    if (order.status === "completed") {
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
    } else {
      await sendMessage(env, user.id, t(lang, "failed"), backHomeKeyboard(lang));
    }
  } else {
    await saveOrder(db, order);
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
  // Same read-modify-write race as in handleCallbackQuery — only write back if the
  // username actually changed, so a text message can't clobber a concurrent balance
  // credit from the payment webhook.
  if (msg.from.username && msg.from.username !== user.username) {
    user.username = msg.from.username;
    await saveUser(db, user);
  }
  const lang = user.lang || "ru";

  // Data sent back from the "🎮 Игры и сервисы" Mini App (real icons, see /webapp).
  if (msg.web_app_data && msg.web_app_data.data) {
    let payload = null;
    try {
      payload = JSON.parse(msg.web_app_data.data);
    } catch {
      // ignore malformed payloads
    }
    if (payload && payload.action === "cat") {
      const catKey = payload.catKey;
      if (catKey === "tg_stars") {
        await setState(db, userId, { step: "await_stars_username", data: {} });
        await sendMessage(env, chatId, t(lang, "enter_username_tg"), backHomeKeyboard(lang));
        return;
      }
      if (CATALOG[catKey]) {
        let cart = { catKey, items: {} };
        await saveCart(db, userId, cart);
        const kb = await cartKeyboard(db, lang, catKey, cart);
        const text = await cartText(db, lang, catKey, cart);
        await sendMessage(env, chatId, text, kb);
      }
      return;
    }
    if (payload && payload.action === "menu") {
      if (payload.target === "pubg") {
        await sendMessage(env, chatId, t(lang, "choose_category"), pubgMenuKeyboard(lang));
      } else if (payload.target === "tg") {
        await sendMessage(env, chatId, t(lang, "choose_category"), tgMenuKeyboard(lang));
      }
      return;
    }
    // "home" action or anything unrecognized just falls through to the main menu below.
    await sendMessage(env, chatId, t(lang, "main_menu"), mainMenuKeyboard(lang, env));
    return;
  }

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
    await sendMessage(env, chatId, t(lang, "main_menu"), mainMenuKeyboard(lang, env));
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
      await sendMessage(env, chatId, t(lang, "invalid_input"), ikb([[btn(t(lang, "btn_retry"), `cat:${state.data.catKey}`)]]));
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
      items: state.data.items,
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
      await sendMessage(env, chatId, t(lang, "invalid_input"), ikb([[btn(t(lang, "btn_retry"), `cat:${state.data.catKey}`)]]));
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
      items: state.data.items,
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

    // Let the admin see every top-up request as it's created, with its id and username,
    // so they can check whether it actually landed in Finik/Donix and, if not, credit it
    // manually right from this message. Normally the /payment-webhook confirms it
    // automatically and this message can just be ignored.
    await sendMessage(
      env,
      env.ADMIN_ID,
      `🧾 Новое пополнение (ожидает оплаты)\nID: ${topupId}\nUser: ${userId} (@${user.username || "-"})\nСумма: ${amount} ${t(lang, "kg_som")}`,
      ikb([
        [btn("✅ Зачислить", `admin:topupok:${topupId}`), btn("❌ Отклонить", `admin:topupno:${topupId}`)],
      ])
    );
    return;
  }

  // no active state, not a recognized command -> show main menu
  await sendMessage(env, chatId, t(lang, "main_menu"), mainMenuKeyboard(lang, env));
}


/* ================= ADMIN PANEL ================= */

function isAdmin(env, userId) {
  return String(userId) === String(env.ADMIN_ID);
}

function adminMainKeyboard() {
  return ikb([
    [btn("📊 Статистика", "admin:stats"), btn("👥 Пользователи", "admin:users")],
    [btn("📦 Заказы", "admin:orders"), btn("💰 Кошельки", "admin:wallets")],
    [btn("💵 Балансы", "admin:balances"), btn("🧾 Пополнения", "admin:topups")],
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

function adminBalanceView(user) {
  const text = [`👤 Пользователь: ${user.id}`, `💰 Баланс: ${user.balance} сом`].join("\n");
  const keyboard = ikb([
    [btn("➕ Пополнить", `admin:baltopup:${user.id}`), btn("➖ Списать", `admin:baldeduct:${user.id}`)],
    [btn("⬅️", "admin:home")],
  ]);
  return { text, keyboard };
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
    await clearState(db, userId);
    await editMessage(
      env,
      chatId,
      messageId,
      [
        "🎟 Промокоды",
        "",
        "Промокод даёт покупателю скидку в процентах от суммы заказа (например, минус 15% при оплате).",
        "",
        "♾ Вечный — работает без срока действия, каждый аккаунт может использовать его только один раз.",
        "📅 На 1 год — перестаёт работать через 1 год, каждый аккаунт может использовать его только один раз.",
        "🛠 Вручную — гибкая настройка (свой лимит использований, минимальная сумма и т.д.).",
      ].join("\n"),
      ikb([
        [btn("♾ Вечный промокод", "admin:promonew:forever")],
        [btn("📅 Промокод на 1 год", "admin:promonew:year")],
        [btn("🛠 Вручную", "admin:promonew:manual")],
        [btn("📋 Список промокодов", "admin:promolist")],
        [btn("⬅️", "admin:home")],
      ])
    );
  } else if (a === "promonew") {
    const mode = b; // "forever" | "year" | "manual"
    if (mode === "manual") {
      await setState(db, userId, { step: "admin_create_promo", data: {} });
      await editMessage(env, chatId, messageId, t(lang, "promo_admin_create_hint"), ikb([[btn("⬅️", "admin:promos")]]));
      return answerCallback(env, cq.id);
    }
    await setState(db, userId, { step: "admin_create_promo_guided", data: { mode } });
    const durationLine = mode === "forever" ? "♾ Без срока действия (вечный)" : "📅 Действует 1 год с момента создания";
    await editMessage(
      env,
      chatId,
      messageId,
      [
        mode === "forever" ? "♾ Новый вечный промокод" : "📅 Новый промокод на 1 год",
        "",
        "Отправьте одним сообщением: КОД;ПРОЦЕНТ",
        "Пример: SALE15;15  (код SALE15, скидка 15%)",
        "",
        "Условия:",
        `• ${durationLine}`,
        "• Каждый аккаунт может применить его только 1 раз",
        "• Количество аккаунтов, которые могут его использовать — не ограничено",
      ].join("\n"),
      ikb([[btn("⬅️", "admin:promos")]])
    );
  } else if (a === "promolist") {
    const promoKeys = await db.list({ prefix: "promo:" });
    const lines = ["📋 Промокоды:"];
    const rows = [];
    let count = 0;
    for (const k of promoKeys.keys) {
      if (k.name.startsWith("promouse:")) continue;
      const p = await getJSON(db, k.name);
      if (!p) continue;
      count++;
      const usesText = p.usesLeft === null ? "∞ (без ограничения)" : `осталось ${p.usesLeft}`;
      const expText = p.expiresAt ? `до ${p.expiresAt.slice(0, 10)}` : "бессрочно";
      const valText = p.type === "percent" ? `-${p.value}%` : `-${p.value} сом`;
      lines.push(`\n${p.active ? "🟢" : "🔴"} ${p.code} — ${valText}\nИспользований: ${usesText}${p.onePerUser ? " (1 на аккаунт)" : ""}\nСрок: ${expText}`);
      rows.push([
        p.active
          ? btn(`🚫 Отменить ${p.code}`, `admin:promotoggle:${p.code}:off`)
          : btn(`♻️ Включить ${p.code}`, `admin:promotoggle:${p.code}:on`),
      ]);
    }
    if (count === 0) lines.push("Пока нет промокодов.");
    rows.push([btn("⬅️", "admin:promos")]);
    await editMessage(env, chatId, messageId, lines.join("\n"), ikb(rows));
  } else if (a === "promotoggle") {
    const code = b;
    const wantOn = c === "on";
    const promo = await getJSON(db, kvKeyPromo(code));
    if (!promo) {
      await answerCallback(env, cq.id, "Промокод не найден.", true);
      return;
    }
    promo.active = wantOn;
    await putJSON(db, kvKeyPromo(promo.code), promo);
    await answerCallback(env, cq.id, wantOn ? `✅ ${promo.code} включён` : `🚫 ${promo.code} отменён`);
    // re-render the list so the status/button updates in place
    const promoKeys = await db.list({ prefix: "promo:" });
    const lines = ["📋 Промокоды:"];
    const rows = [];
    let count = 0;
    for (const k of promoKeys.keys) {
      if (k.name.startsWith("promouse:")) continue;
      const p = await getJSON(db, k.name);
      if (!p) continue;
      count++;
      const usesText = p.usesLeft === null ? "∞ (без ограничения)" : `осталось ${p.usesLeft}`;
      const expText = p.expiresAt ? `до ${p.expiresAt.slice(0, 10)}` : "бессрочно";
      const valText = p.type === "percent" ? `-${p.value}%` : `-${p.value} сом`;
      lines.push(`\n${p.active ? "🟢" : "🔴"} ${p.code} — ${valText}\nИспользований: ${usesText}${p.onePerUser ? " (1 на аккаунт)" : ""}\nСрок: ${expText}`);
      rows.push([
        p.active
          ? btn(`🚫 Отменить ${p.code}`, `admin:promotoggle:${p.code}:off`)
          : btn(`♻️ Включить ${p.code}`, `admin:promotoggle:${p.code}:on`),
      ]);
    }
    if (count === 0) lines.push("Пока нет промокодов.");
    rows.push([btn("⬅️", "admin:promos")]);
    await editMessage(env, chatId, messageId, lines.join("\n"), ikb(rows));
    return;
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
  } else if (a === "topups") {
    const topupKeys = await db.list({ prefix: "topup:" });
    const topups = [];
    for (const k of topupKeys.keys) {
      const tu = await getJSON(db, k.name);
      if (tu) topups.push(tu);
    }
    topups.sort((x, y) => new Date(y.createdAt || 0) - new Date(x.createdAt || 0));
    const recent = topups.slice(0, 15);
    const statusLabel = { pending: "🟡 ожидает", confirmed: "🟢 зачислено", rejected: "🔴 отклонено" };
    const lines = ["🧾 Пополнения баланса (последние):", ""];
    const rows = [];
    for (const tu of recent) {
      const u = await getUser(db, tu.userId);
      lines.push(
        `ID: ${tu.topupId}\nUser: ${tu.userId} (@${u.username || "-"})\nСумма: ${tu.amount} сом — ${statusLabel[tu.status] || tu.status}${tu.transactionId ? `\nПлатёж: ${tu.transactionId}` : ""}`
      );
      lines.push("");
      if (tu.status === "pending") {
        rows.push([btn(`✅ ${tu.amount} сом — ${u.username || tu.userId}`, `admin:topupok:${tu.topupId}`), btn("❌", `admin:topupno:${tu.topupId}`)]);
      }
    }
    if (recent.length === 0) lines.push("Пока нет заявок на пополнение.");
    lines.push("Если статус «ожидает», а оплата по факту прошла — нажмите ✅, чтобы зачислить баланс вручную.");
    rows.push([btn("⬅️", "admin:home")]);
    await editMessage(env, chatId, messageId, lines.join("\n").trim(), ikb(rows));
  } else if (a === "balances") {
    await setState(db, userId, { step: "admin_balance_lookup", data: {} });
    await editMessage(env, chatId, messageId, "Введите Telegram ID пользователя:", ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "baltopup") {
    const targetId = b;
    await setState(db, userId, { step: "admin_balance_topup", data: { targetId } });
    await editMessage(env, chatId, messageId, "Введите сумму пополнения (сом):", ikb([[btn("⬅️", "admin:home")]]));
  } else if (a === "baldeduct") {
    const targetId = b;
    await setState(db, userId, { step: "admin_balance_deduct", data: { targetId } });
    await editMessage(env, chatId, messageId, "Введите сумму списания (сом):", ikb([[btn("⬅️", "admin:home")]]));
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

  if (state.step === "admin_create_promo_guided") {
    const mode = state.data.mode; // "forever" | "year"
    const parts = text.split(";").map((p) => p.trim());
    const code = parts[0];
    const value = parseFloat((parts[1] || "").replace(",", "."));
    if (!code || !Number.isFinite(value) || value <= 0 || value > 100) {
      await sendMessage(
        env,
        chatId,
        "Неверный формат. Отправьте: КОД;ПРОЦЕНТ\nПример: SALE15;15 (процент от 1 до 100)"
      );
      return;
    }
    const promo = await createPromo(db, {
      code,
      type: "percent",
      value,
      uses: null, // unlimited accounts can use it, each only once (onePerUser below)
      days: mode === "year" ? 365 : null, // null = never expires ("вечный")
      minSum: 0,
      onePerUser: true,
    });
    await clearState(db, userId);
    const durationText = mode === "year" ? "1 год" : "бессрочно (вечный)";
    await sendMessage(
      env,
      chatId,
      [
        "✅ Промокод создан",
        `Код: ${promo.code}`,
        `Скидка: -${promo.value}% от суммы заказа`,
        `Срок действия: ${durationText}`,
        "Использование: по 1 разу на каждый аккаунт, число аккаунтов не ограничено",
      ].join("\n"),
      adminMainKeyboard()
    );
    return;
  }

  if (state.step === "admin_balance_lookup") {
    const targetId = text.trim();
    if (!/^\d+$/.test(targetId)) {
      await sendMessage(env, chatId, "Неверный Telegram ID. Отправьте число, например: 123456789");
      return;
    }
    await clearState(db, userId);
    const targetUser = await getUser(db, targetId);
    const view = adminBalanceView(targetUser);
    await sendMessage(env, chatId, view.text, view.keyboard);
    return;
  }

  if (state.step === "admin_balance_topup") {
    const { targetId } = state.data;
    const amount = Number(text.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      await sendMessage(env, chatId, "Неверная сумма. Отправьте число, например: 200");
      return;
    }
    const { oldBalance, newBalance } = await adminTopUpBalance(db, userId, targetId, amount);
    await clearState(db, userId);
    await sendMessage(
      env,
      chatId,
      `✅ Баланс изменён\n\nБыло: ${oldBalance} сом\nИзменение: +${amount} сом\nСтало: ${newBalance} сом`,
      adminMainKeyboard()
    );
    return;
  }

  if (state.step === "admin_balance_deduct") {
    const { targetId } = state.data;
    const amount = Number(text.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      await sendMessage(env, chatId, "Неверная сумма. Отправьте число, например: 150");
      return;
    }
    const result = await adminDeductBalance(db, userId, targetId, amount);
    if (!result.ok) {
      await sendMessage(env, chatId, `❌ Недостаточно средств на балансе. Текущий баланс: ${result.balance} сом`);
      return;
    }
    await clearState(db, userId);
    await sendMessage(
      env,
      chatId,
      `✅ Баланс изменён\n\nБыло: ${result.oldBalance} сом\nИзменение: -${amount} сом\nСтало: ${result.newBalance} сом`,
      adminMainKeyboard()
    );
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

/* ================= MINI APP (game menu with real icons) ================= */

const WEBAPP_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Nurtilek Shop</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  :root {
    --bg: #ffffff;
    --text: #111111;
    --hint: #707579;
    --card: #f2f2f2;
    --accent: #2ea6ff;
    --accent-text: #ffffff;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  body {
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px)) 14px;
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
  }
  h1 {
    font-size: 20px; font-weight: 700; text-align: center; margin: 4px 0 14px 0;
  }
  .subtitle {
    background: var(--card); color: var(--hint);
    border-radius: 14px; padding: 14px 16px; text-align: center;
    font-size: 15px; margin-bottom: 14px;
  }
  .grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .grid.full { grid-template-columns: 1fr; }
  .card {
    display: flex; align-items: center; gap: 10px;
    background: var(--card); border-radius: 14px;
    padding: 10px 14px; cursor: pointer; border: none;
    font-size: 15px; font-weight: 500; color: var(--text);
    text-align: left; width: 100%;
    -webkit-tap-highlight-color: transparent;
    transition: transform .08s ease, opacity .08s ease;
  }
  .card:active { transform: scale(0.97); opacity: 0.85; }
  .card img {
    width: 30px; height: 30px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
  }
  .divider {
    display: flex; align-items: center; gap: 10px;
    color: var(--hint); font-size: 13px; margin: 18px 0 10px 0;
  }
  .divider::before, .divider::after {
    content: ""; flex: 1; height: 1px; background: var(--hint); opacity: .3;
  }
  .home {
    margin-top: 18px; width: 100%; border: none; border-radius: 14px;
    background: var(--accent); color: var(--accent-text);
    font-size: 16px; font-weight: 600; padding: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
</style>
</head>
<body>
  <h1>🎮 Игры и сервисы</h1>
  <div class="subtitle">Выберите игру или сервис</div>

  <div class="grid" id="gamesGrid">
    <button class="card" data-action='{"action":"cat","catKey":"freefire"}'>
      <img src="data:image/jpeg;base64,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" alt="">
      <span>Free Fire</span>
    </button>
    <button class="card" data-action='{"action":"cat","catKey":"mlbb"}'>
      <img src="data:image/jpeg;base64,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" alt="">
      <span>Mobile Legends</span>
    </button>
    <button class="card" data-action='{"action":"menu","target":"pubg"}'>
      <img src="data:image/jpeg;base64,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" alt="">
      <span>PUBG Mobile</span>
    </button>
  </div>

  <div class="divider">Сервисы</div>
  <div class="grid full">
    <button class="card" data-action='{"action":"menu","target":"tg"}'>
      <img src="data:image/jpeg;base64,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" alt="">
      <span>Telegram (Stars / Premium)</span>
    </button>
  </div>

  <button class="home" id="homeBtn">🏠 Главное меню</button>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Adopt Telegram's own theme colors so the page matches light/dark mode.
      const p = tg.themeParams || {};
      const root = document.documentElement.style;
      if (p.bg_color) root.setProperty('--bg', p.bg_color);
      if (p.text_color) root.setProperty('--text', p.text_color);
      if (p.hint_color) root.setProperty('--hint', p.hint_color);
      if (p.secondary_bg_color) root.setProperty('--card', p.secondary_bg_color);
      if (p.button_color) root.setProperty('--accent', p.button_color);
      if (p.button_text_color) root.setProperty('--accent-text', p.button_text_color);
    }

    function send(payload) {
      if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(payload));
        tg.close();
      } else {
        // Fallback for opening outside Telegram (e.g. testing in a browser).
        alert('Открой это меню через кнопку в боте Telegram.');
      }
    }

    document.querySelectorAll('.card').forEach((el) => {
      el.addEventListener('click', () => {
        send(JSON.parse(el.getAttribute('data-action')));
      });
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
      send({ action: 'home' });
    });
  </script>
</body>
</html>
`;

/* ================= MAIN FETCH ================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const db = env.DB;

    if (request.method === "GET" && url.pathname === "/health") {
      return routeHealth();
    }

    if (request.method === "GET" && url.pathname === "/webapp") {
      return new Response(WEBAPP_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
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
