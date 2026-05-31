import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';
const MAX_LOGIN_WAIT = 120000;

interface WxMeta {
  uid: string;
  nickName: string;
  token: string;
  ticket: string;
  svrTime: string;
}

async function readWxMeta(): Promise<WxMeta | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'READ_WX_META' }, (response) => {
      if (chrome.runtime.lastError || !response?.meta) {
        resolve(null);
      } else {
        resolve(response.meta as WxMeta);
      }
    });
  });
}

async function waitForMeta(): Promise<WxMeta | null> {
  const start = Date.now();
  let toastShown = false;

  while (Date.now() - start < MAX_LOGIN_WAIT) {
    const meta = await readWxMeta();
    if (meta) return meta;

    if (!toastShown) {
      showContentBridgeToast('⏳ 请先登录微信公众号后台，登录后自动继续…', 'info');
      toastShown = true;
    }

    await sleep(3000);
  }

  return null;
}

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  if (window.self !== window.top) return;

  const { title, body } = fill.content as { title: string; body: string };

  try {
    showContentBridgeToast('🔄 正在检测登录状态…', 'info');

    const meta = await waitForMeta();
    if (!meta) return fail('等待登录超时（2分钟），请重新点击发布');

    await chrome.storage.local.remove('contentbridge_fill');

    showContentBridgeToast('✅ 已登录，正在创建草稿…', 'success');

    const draftResult = await createDraft(meta, title, body);
    if (!draftResult) return fail('创建草稿失败，请检查公众号后台是否正常');

    const draftLink = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${draftResult.appMsgId}&token=${meta.token}&lang=zh_CN`;

    window.open(draftLink, '_blank');

    done(`草稿已创建，请在打开的编辑页中确认并点击发布`);
  } catch (err) {
    await chrome.storage.local.remove('contentbridge_fill');
    fail(err instanceof Error ? err.message : '公众号发布失败');
  }
})();

async function createDraft(
  meta: WxMeta,
  title: string,
  content: string,
): Promise<{ appMsgId: string } | null> {
  try {
    const params = new URLSearchParams();
    params.set('token', meta.token);
    params.set('lang', 'zh_CN');
    params.set('f', 'json');
    params.set('ajax', '1');
    params.set('random', String(Math.random()));
    params.set('AppMsgId', '');
    params.set('count', '1');
    params.set('data_seq', '0');
    params.set('operate_from', 'Chrome');
    params.set('isnew', '0');
    params.set('title0', title);
    params.set('content0', content);
    params.set('author0', '');
    params.set('writerid0', '0');
    params.set('fileid0', '');
    params.set('digest0', '');
    params.set('auto_gen_digest0', '1');
    params.set('sourceurl0', '');
    params.set('need_open_comment0', '1');
    params.set('only_fans_can_comment0', '0');
    params.set('cdn_url0', '');
    params.set('cdn_235_1_url0', '');
    params.set('cdn_1_1_url0', '');
    params.set('cdn_url_back0', '');
    params.set('crop_list0', '');
    params.set('music_id0', '');
    params.set('video_id0', '');
    params.set('voteid0', '');
    params.set('voteismlt0', '');
    params.set('supervoteid0', '');
    params.set('cardid0', '');
    params.set('cardquantity0', '');
    params.set('cardlimit0', '');
    params.set('vid_type0', '');
    params.set('show_cover_pic0', '0');
    params.set('shortvideofileid0', '');
    params.set('copyright_type0', '0');
    params.set('releasefirst0', '');
    params.set('platform0', '');
    params.set('reprint_permit_type0', '');
    params.set('allow_reprint0', '');
    params.set('allow_reprint_modify0', '');
    params.set('original_article_type0', '');
    params.set('ori_white_list0', '');
    params.set('free_content0', '');
    params.set('fee0', '0');
    params.set('ad_id0', '');
    params.set('guide_words0', '');
    params.set('is_share_copyright0', '0');
    params.set('share_copyright_url0', '');
    params.set('source_article_type0', '');
    params.set('reprint_recommend_title0', '');
    params.set('reprint_recommend_content0', '');
    params.set('share_page_type0', '0');
    params.set('share_imageinfo0', '{"list":[]}');
    params.set('share_video_id0', '');
    params.set('dot0', '{}');
    params.set('share_voice_id0', '');
    params.set('insert_ad_mode0', '');
    params.set('categories_list0', '[]');
    params.set('can_reward0', '0');
    params.set('ad_video_transition0', '');
    params.set('related_video0', '');
    params.set('is_video_recommend0', '-1');

    const resp = await fetch(
      `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${meta.token}&lang=zh_CN`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
    );

    const result = await resp.json();
    console.log('[MultiPublish] createDraft response:', result);

    if (result.appMsgId) {
      return { appMsgId: String(result.appMsgId) };
    }

    const errMsg = formatWxError(result);
    console.error('[MultiPublish] createDraft error:', errMsg, result);
    return null;
  } catch (err) {
    console.error('[MultiPublish] createDraft failed:', err);
    return null;
  }
}

function formatWxError(e: Record<string, unknown>): string {
  let ret = 0;
  if (typeof e.ret === 'number') ret = e.ret;
  else if (e.base_resp && typeof (e.base_resp as Record<string, unknown>).ret === 'number')
    ret = (e.base_resp as Record<string, unknown>).ret as number;

  const errorMap: Record<number, string> = {
    [-8]: '请输入验证码',
    [-6]: '请输入验证码',
    62752: '可能含有安全风险链接',
    64504: '保存图文消息错误',
    412: '图文中含非法外链',
    64702: '标题超出64字限制',
    64703: '摘要超出120字限制',
    320001: '素材已被删除',
  };

  return errorMap[ret] || (e.errmsg as string) || `错误(ret=${ret})`;
}

function done(msg: string) {
  chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: true, message: msg },
  });
  showContentBridgeToast(`✅ ${msg}`, 'success');
}

function fail(msg: string) {
  chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: msg, error: msg },
  });
  showContentBridgeToast(`❌ ${msg}`, 'error');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
