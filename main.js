const global = {
    minId: -1,
    json: [],
    process_time: "",
    isContinue: true,
    json_index: 0,
}

/**
 * 検索開始ボタンアクション
 * @returns void
 */
async function search() {
    // 今までの出力結果を全削除
    clearToots();

    // 入力チェック
    let instance = _$('#instance').value.trim();
    let token = _$('#token').value.trim();

    instance = instance.indexOf('/', 8) == -1 ? instance : instance.substring(0, instance.indexOf('/', 8));
    _$('#instance').value = instance;

    if (!instance) {
        pop_error('Instance is empty.');
        return false;
    }
    if (!token) {
        pop_error('Token is empty.');
        return false;
    }

    const periodArray = getPeriodArray();
    const option = {
        sendnotestock: $('#sendnotestock').prop('checked')
    };
    const save_point = localStorage.getItem(token + periodArray[0] + periodArray[1]);
    global.minId = save_point ? save_point : -1;

    // フォームに入力されている内容をlocalStorageに保存する
    saveForms();

    /*
     * toot取り出しのための初期設定
     */
    global.process_time = getFormattedTime()
    _$("#process_time").innerText = global.process_time + " 〜 ";

    const status = getStatus(instance, token);
    _$("#progress").max = status.statuses_count;

    $("#spinner").removeClass("d-none");

    // Mastodon APIは5分間に300回まで呼び出せる
    // 5 * 60 = 300 なので、1秒ごとに1回のペースで呼び出せば呼び出し上限にはかからないはず
    // 念のため 1.1秒に1回API呼び出しを行う
    // getEntries()に含まれる最後のtootから次のtootを取得するため、httpリクエストの帰りを待つ
    // もっと生かした仕組みができそうな気がするけど、実力が足りない
    do {
        await sleep(1500);
        getEntries(instance, token, periodArray[0], periodArray[1], status, option);
    } while (global.isContinue);
}

/**
 * 一時的に実行を止める
 * @param {int} ms ミリ秒
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * tootの取得期間を取得する
 * @returns {Array} 期間の配列 [start, end]
 */
function getPeriodArray() {
    let periodArray = _$('#period').value.trim().replace(/^(?!.*(\d+|-+)).*$/, "").replace(/\s+/, " ").split(" ");
    if (periodArray.length == 0) {
        periodArray = ["0000-01-01", "9999-12-31"];
    } else if (periodArray.length < 2) {
        periodArray.push("9999-12-31");
    }

    // 日付を照準に入れ替え
    if (periodArray[0] > periodArray[1]) {
        const temp = periodArray[0];
        periodArray[0] = periodArray[1];
        periodArray[1] = temp;
    }

    return periodArray;
}


/**
 * HTML要素の取り出しショートカット
 * @param {Element} id
 * @returns HTML要素
 */
function _$(id) {
    return document.querySelector(id);
}

/**
 * status(=toot)を取り出す
 * @param {*} instance https://qiitadon.com など、インスタンスのURL
 * @param {*} token アプリケーショントークン
 * @returns toot内容のJSON
 */
function getStatus(instance, token) {
    let r = new XMLHttpRequest();
    r.open("GET", instance + '/api/v1/accounts/verify_credentials', false);
    r.setRequestHeader("Authorization", "Bearer " + token);
    r.send(null);

    let json = JSON.parse(r.responseText);
    if (json) {
        return json;
    } else {
        return null;
    }
}

/**
 * 画面に表示しているtootをJSON形式ファイルでダウンロードする
 */
function getJson() {
    // 現在取得している最後のtootのIDを取得し、セーブしておく
    const period = getPeriodArray();
    localStorage.setItem(localStorage.getItem('token') + period[0] + period[1], global.minId);

    // アンカータグの作成
    const downLoadLink = document.createElement("a");

    // ダウンロードするHTML文章の生成
    // concat() で重複を削除している（必要ないかも）
    let json = [];
    let first_obj;
    let last_obj;
    for (last_obj of global.json) {
        if (!first_obj) {
            first_obj = last_obj;
        }
        json = json.concat(last_obj);
    }

    // first_obj のほうが最近に近いので、それを後ろにする
    const time = last_obj.created_at.replace(/T.*/, '') + " - " + first_obj.created_at.replace(/T.*/, '');
    const outputDataString = JSON.stringify(json);
    const downloadFileName = localStorage.getItem('instance').replace(/https?:\/\//, '') + " toots (" + time + ").json";
    const filetype = "application/json";
    downLoadLink.download = downloadFileName;
    downLoadLink.href = URL.createObjectURL(new Blob([outputDataString], { type: filetype }));
    downLoadLink.dataset.downloadurl = [filetype, downloadFileName, downLoadLink.href].join(":");
    downLoadLink.click();
}

/**
 * 画面に表示しているtootをHTML形式ファイルでダウンロードする
 */
function getHTML() {
    // 現在取得している最後のtootのIDを取得し、セーブしておく
    const period = getPeriodArray();
    localStorage.setItem(localStorage.getItem('token') + period[0] + period[1], global.minId);

    // アンカータグの作成
    const downLoadLink = document.createElement("a");

    // ダウンロードするHTML文章の生成
    const outputDataString = "<html><head><meta charset='utf-8'><style>.boost{border:2px solid #009af4;border-radius:4px;background-color:#fff;margin:15px;padding:15px}.toot{border:2px solid #52b03b;border-radius:4px;background-color:#fff;margin:15px;padding:15px}#progress{display:inline}.time{background-color:#fff}</style></head><body>" + _$("#result").innerHTML + "</body></html>";
    const downloadFileName = localStorage.getItem('instance').replace(/https?:\/\//, '') + " toots (" + _$("#period").value + ").html";
    const filetype = "application/json";
    downLoadLink.download = downloadFileName;
    downLoadLink.href = URL.createObjectURL(new Blob([outputDataString], { type: filetype }));
    downLoadLink.dataset.downloadurl = [filetype, downloadFileName, downLoadLink.href].join(":");
    downLoadLink.click();
}

/**
 * tootを取り出して、HTMLに表示する。setTImeoutで1.2秒ごとに呼び出される
 * @param {*} instance https://qiitadon.com など、インスタンスのURL
 * @param {*} token アプリケーショントークン
 * @param {*} period_start '2021-01-01' など、取得する期間の開始日
 * @param {*} period_end '2021-12-31' など、取得する期間の終了日
 * @param {*} status APIで取得したユーザー情報
 * @param {*} option その他オプション {sendnotestock, ...}
 */
function getEntries(instance, token, period_start, period_end, status, option) {
    let prog = _$("#progress");

    //　現在までに取得しているtootの最大ID。これを指定してより過去のtootを取得するAPIを呼び出す
    let strMaxId = "";
    if (global.minId >= 0) {
        strMaxId = "&max_id=" + global.minId;
    }

    let r = new XMLHttpRequest();
    r.onload = () => {
        let json = JSON.parse(r.responseText);

        // APIの結果に自分のtootが含まれていれば処理を行う
        if (Object.keys(json).length && global.isContinue) {
            if (json.error) {
                pop_error(json.error);
                return;
            }

            // APIで取得した最大40件のtootを分解する
            let targetUri = [];
            try {
                json.forEach((toot) => {
                    let day = toot.created_at.replace(/[A-Z].+$/, "");

                    // 指定した期間内のtootのみ表示する
                    if (period_start <= day && day <= period_end) {
                        if (global.json.length >= 5000) {
                            getJson();
                            global.json = [];
                        }
                        // global.json[global.json_index].push({
                        global.json.push({
                            "created_at": toot.created_at,
                            "content": toot.content,
                            "url": toot.url,
                            "media_attachments": toot.media_attachments
                        });
                        // showEntries(toot);
                        if (option.sendnotestock) {
                            targetUri.push(toot.uri);
                        }
                    }
                    _$("#now-date").innerText = toot.created_at.replace(/T.*/, '');

                    let link = r.getResponseHeader("Link");
                    if (/max_id=\d+/.test(link)) {
                        global.minId = link.match(/max_id=\d+/)[0].replace(/max_id=/, "");
                        prog.value += 1;

                        // 完了するまで100%にしないため分母を99で掛ける
                        _$("#prog-num").innerHTML = Math.floor(prog.value / prog.max * 99) + "%";
                    } else {
                        // ファイルをダウンロードする
                        getJson();
                        global.json = [];

                        // セーブポイントを消す
                        removeSavePoint();

                        // ループを抜ける
                        throw new Exception();
                    }
                    if (day < period_start) {
                        prog.value = prog.max;

                        // ファイルをダウンロードする
                        getJson();
                        global.json = [];

                        // セーブポイントを消す
                        removeSavePoint();

                        // ループを抜ける
                        throw new Exception();
                    }
                });
            } catch (e) {
                // ループを抜ける
                _$("#prog-num").innerHTML = "100%";
                $("#spinner").addClass("d-none");
                _$("#process_time").innerText = global.process_time + " 〜 " + getFormattedTime();

                if (targetUri && option.sendnotestock) {
                    let notestock = new XMLHttpRequest();
                    notestock.open("POST", "https://notestock.osa-p.net/api/v1/urlstock.json");
                    notestock.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    notestock.send('url=' + encodeURIComponent(targetUri.join(',')));
                }

                global.isContinue = false;
            }
        }
    };

    // APIを呼び出してtootを取得する
    console.log(`${instance}/api/v1/accounts/${status.id}/statuses?limit=40${strMaxId}`)
    r.open("GET", `${instance}/api/v1/accounts/${status.id}/statuses?limit=40${strMaxId}`, true);
    r.setRequestHeader("Authorization", "Bearer " + token);
    r.send(null);
}

/**
 * 添付画像をタグに変換して表示できるようにする
 * @param {*} toot tootデータを持つjsオブジェクト
 * @returns {string} htmlタグ
 */
function getImages(toot) {
    var imagesUrl = new Array();
    toot.media_attachments.forEach((item) => {
        imagesUrl.push(item.preview_url + " " + item.url);
    });

    let retValue = "";
    let index = 1;
    imagesUrl.forEach((elem) => {
        let tmp = elem.split(" ");
        retValue += "<a href='" + tmp[1] + "' target='_brank'><img src='" + tmp[0] + "' width='256' height='256' alt='添付画像" + index++ + "'></a>";
    });

    return retValue;
}

/**
 * エラーメッセージの表示
 * @param {string} msg 表示するメッセージ
 */
function pop_error(msg) {
    console.log(msg);
    alert(msg);
}

/**
 * tootを画面に追加する
 * @param {object} toot tootデータを持つjsオブジェクト
 */
function showEntries(toot) {
    let cls = "toot";
    if (/^<p>RT\s</.test(toot.content)) {
        cls = "boost";
    } else {
        cls = "toot";
    }
    _$('#result').innerHTML
        += "<div class='" + cls + "'>"
        + "<p><span>"
        + toot.account.username
        + "&nbsp;&nbsp;&nbsp;toot id:"
        + toot.id + "&nbsp;&nbsp;&nbsp;created_at:" + toot.created_at + "</span></p>"
        + "<p>" + toot.content + "</p>"
        + "<p>" + getImages(toot) + "</p>"
        + "</div>";
}

/**
 * ブーストの表示／非表示を切り替える
 */
function hiddenBoost() {
    $(".boost").toggleClass("d-none");
}

/**
 * フォームの内容をブラウザに保存する
 */
function saveForms() {
    let s = localStorage;
    s.setItem('instance', _$('#instance').value.trim());
    // s.setItem('username', _$('#username').value.trim());
    s.setItem('token', _$('#token').value.trim());
    s.setItem('period', _$('#period').value.trim());
}

/**
 * フォームの内容をブラウザから読み込む
 */
function loadForms() {
    let s = localStorage;
    _$('#instance').value = s.getItem('instance');
    // _$('#username').value = s.getItem('username');
    _$('#token').value = s.getItem('token');
    _$('#period').value = s.getItem('period');
}

/**
 * 現在時刻を文字列で返す
 * @returns {string} 'hh:mm:ss'
 */
function getFormattedTime() {
    var dd = new Date();
    var hh = ("00" + dd.getHours()).slice(-2);
    var mm = ("00" + dd.getMinutes()).slice(-2);
    var ss = ("00" + dd.getSeconds()).slice(-2);
    return hh + ":" + mm + ":" + ss;
}

/**
 * 取得したtootを画面から削除する
 */
function clearToots() {
    global.minId = -1,
        global.json = [],
        global.isContinue = true,
        global.json_index = 0,
        global.process_time = "";
    // _$('#result').innerHTML = "";
}

/**
 * セー府ポイントの削除
 */
function removeSavePoint() {
    const period = getPeriodArray();
    localStorage.removeItem(localStorage.getItem('token') + period[0] + period[1]);
}

// 画面ロード時の初期化処理
window.onload = () => {
    // localStorageからフォームの内容を読み込む
    loadForms();

    let instance = _$('#instance').value.trim();
    instance = instance.indexOf('/', 8) == -1 ? instance : instance.substring(0, instance.indexOf('/', 8));

    const token = _$('#token').value.trim();
    const periodArray = getPeriodArray();
    const save_point = localStorage.getItem(token + periodArray[0] + periodArray[1]);

    // ダウンロード途中であればラベルを変更する
    if (save_point) {
        _$('#id_next').innerText = "続きから取得";
    }

    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    })
}
