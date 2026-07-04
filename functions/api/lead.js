const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function getTelegramSettings(env) {
  return {
    token: env.TG_TOKEN || env.BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || 'PASTE_TELEGRAM_BOT_TOKEN_HERE',
    chatId: env.TG_CHAT_ID || env.CHAT_ID || env.TELEGRAM_CHAT_ID || 'PASTE_TELEGRAM_CHAT_ID_HERE'
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const { token, chatId } = getTelegramSettings(env);

  if (!token || token.startsWith('PASTE_') || !chatId || chatId.startsWith('PASTE_')) {
    return json({ ok: false, error: 'telegram_settings_missing' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch (error) {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const source = clean(data.source, 40);
  const name = clean(data.name, 120);
  const phone = clean(data.phone, 80);
  const telegram = clean(data.telegram, 120) || '-';
  const email = clean(data.email, 160) || '-';
  const tour = clean(data.tour, 160) || '-';
  const comment = clean(data.comment, 1200) || '-';
  const page = clean(data.page, 240) || '-';

  if (!name || !phone) {
    return json({ ok: false, error: 'required_fields_missing' }, 400);
  }

  const dateStr = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const text = source === 'tour'
    ? [
        'Новая заявка со страницы тура - ' + dateStr,
        '',
        'Тур: ' + tour,
        'Имя: ' + name,
        'Телефон: ' + phone,
        'Telegram: ' + telegram,
        'Страница: ' + page
      ].join('\n')
    : [
        'Новая заявка с сайта - ' + dateStr,
        '',
        'Имя: ' + name,
        'Телефон: ' + phone,
        'E-mail: ' + email,
        'Telegram: ' + telegram,
        'Тур: ' + tour,
        'Комментарий: ' + comment,
        'Страница: ' + page
      ].join('\n');

  const telegramResponse = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  const telegramResult = await telegramResponse.json().catch(() => ({ ok: false }));

  if (!telegramResponse.ok || !telegramResult.ok) {
    return json({ ok: false, error: 'telegram_send_failed' }, 502);
  }

  return json({ ok: true });
}

export async function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
