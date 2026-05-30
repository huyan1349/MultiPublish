import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';

interface WxCommonData {
  data: {
    t: string;
    user_name: string;
    nick_name: string;
    ticket: string;
    time: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface WxMeta {
  uid: string;
  title: string;
  token: string;
  commonData: WxCommonData;
}

let wxMetaCache: WxMeta | null = null;

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  await chrome.storage.local.remove('contentbridge_fill');

  if (window.self !== window.top) return;

  const { title, body } = fill.content as { title: string; body: string };

  try {
    const meta = await getWxMeta();
    if (!meta) return fail('未检测到登录状态，请先在浏览器中登录微信公众号后台');

    const draftResult = await createDraft(meta, title, body);
    if (!draftResult) return fail('创建草稿失败，请检查公众号后台是否正常');

    const draftLink = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${draftResult.appMsgId}&token=${meta.token}&lang=zh_CN`;

    showContentBridgeToast('✅ 草稿已创建，正在打开编辑页…', 'success');

    window.open(draftLink, '_blank');

    done(`公众号草稿已创建（ID: ${draftResult.appMsgId}），请在打开的编辑页中确认并发布`);
  } catch (err) {
    fail(err instanceof Error ? err.message : '公众号发布失败');
  }
})();

async function getWxMeta(): Promise<WxMeta | null> {
  if (wxMetaCache) return wxMetaCache;

  try {
    const res = await fetch('https://mp.weixin.qq.com/', { credentials: 'include' });
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const scripts = doc.querySelectorAll('script');
    let commonDataCode = '';
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('window.wx.commonData')) {
        commonDataCode = text;
        break;
      }
    }

    if (!commonDataCode) return null;

    const startIdx = commonDataCode.indexOf('window.wx.commonData');
    if (startIdx === -1) return null;
    const code = commonDataCode.substring(startIdx);

    const wx: { commonData: WxCommonData } = new Function(
      'window.wx = {}; window.handlerNickname = function(){}; ' + code + '; return window.wx;',
    )() as typeof wx;

    const commonData = wx.commonData;
    if (!commonData?.data?.t) return null;

    wxMetaCache = {
      uid: commonData.data.user_name,
      title: commonData.data.nick_name,
      token: commonData.data.t,
      commonData,
    };

    return wxMetaCache;
  } catch (err) {
    console.error('[MultiPublish] getWxMeta failed:', err);
    return null;
  }
}

async function createDraft(
  meta: WxMeta,
  title: string,
  content: string,
): Promise<{ appMsgId: string } | null> {
  try {
    const formData = new URLSearchParams();
    formData.set('token', meta.token);
    formData.set('lang', 'zh_CN');
    formData.set('f', 'json');
    formData.set('ajax', '1');
    formData.set('random', String(Math.random()));
    formData.set('AppMsgId', '');
    formData.set('count', '1');
    formData.set('data_seq', '0');
    formData.set('operate_from', 'Chrome');
    formData.set('isnew', '0');
    formData.set('title0', title);
    formData.set('content0', content);
    formData.set('author0', '');
    formData.set('writerid0', '0');
    formData.set('fileid0', '');
    formData.set('digest0', '');
    formData.set('auto_gen_digest0', '1');
    formData.set('sourceurl0', '');
    formData.set('need_open_comment0', '1');
    formData.set('only_fans_can_comment0', '0');
    formData.set('cdn_url0', '');
    formData.set('cdn_235_1_url0', '');
    formData.set('cdn_1_1_url0', '');
    formData.set('cdn_url_back0', '');
    formData.set('crop_list0', '');
    formData.set('music_id0', '');
    formData.set('video_id0', '');
    formData.set('voteid0', '');
    formData.set('voteismlt0', '');
    formData.set('supervoteid0', '');
    formData.set('cardid0', '');
    formData.set('cardquantity0', '');
    formData.set('cardlimit0', '');
    formData.set('vid_type0', '');
    formData.set('show_cover_pic0', '0');
    formData.set('shortvideofileid0', '');
    formData.set('copyright_type0', '0');
    formData.set('releasefirst0', '');
    formData.set('platform0', '');
    formData.set('reprint_permit_type0', '');
    formData.set('allow_reprint0', '');
    formData.set('allow_reprint_modify0', '');
    formData.set('original_article_type0', '');
    formData.set('ori_white_list0', '');
    formData.set('free_content0', '');
    formData.set('fee0', '0');
    formData.set('ad_id0', '');
    formData.set('guide_words0', '');
    formData.set('is_share_copyright0', '0');
    formData.set('share_copyright_url0', '');
    formData.set('source_article_type0', '');
    formData.set('reprint_recommend_title0', '');
    formData.set('reprint_recommend_content0', '');
    formData.set('share_page_type0', '0');
    formData.set('share_imageinfo0', '{"list":[]}');
    formData.set('share_video_id0', '');
    formData.set('dot0', '{}');
    formData.set('share_voice_id0', '');
    formData.set('insert_ad_mode0', '');
    formData.set('categories_list0', '[]');
    formData.set('can_reward0', '0');
    formData.set('ad_video_transition0', '');
    formData.set('related_video0', '');
    formData.set('is_video_recommend0', '-1');

    const resp = await fetch(
      `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${meta.token}&lang=zh_CN`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    const result = await resp.json();
    console.log('[MultiPublish] createDraft response:', result);

    if (result.appMsgId) {
      return { appMsgId: String(result.appMsgId) };
    }

    const errMsg = formatWxError(result);
    console.error('[MultiPublish] createDraft error:', errMsg);
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
    62752: '可能含有具备安全风险的链接，请检查',
    64505: '发送预览失败，请稍后再试',
    64504: '保存图文消息发送错误，请稍后再试',
    412: '图文中含非法外链',
    64702: '标题超出64字长度限制',
    64703: '摘要超出120字长度限制',
    320001: '该素材已被删除，无法保存',
  };

  return errorMap[ret] || (e.errmsg as string) || `未知错误(ret=${ret})`;
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
