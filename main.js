var minId = -1;
var globalJson = [];
var timer = null;
var process_time = "";

/**
 * 検索開始ボタンアクション
 * @returns void
 */
function search() {
    // 今までの出力結果を全削除
    clearToots();

    // 入力チェック
    let instance = _$('#instance').value.trim();
    let username = _$('#username').value.trim();
    let token = _$('#token').value.trim();
    let period = _$('#period').value.trim();

    instance = instance.indexOf('/', 8) == -1 ? instance : instance.substring(0, instance.indexOf('/', 8));
    console.log(instance.substring(0, instance.indexOf('/', 8)));
    _$('#instance').value = instance;

    if (!instance) {
        pop_error('Instance is empty.');
        return false;
    }
    if (!username) {
        pop_error('Username is empty.');
        return false;
    }
    if (!token) {
        pop_error('Token is empty.');
        return false;
    }

    let periodArray = period.replace(/^(?!.*(\d+|-+)).*$/, "").replace(/\s+/, " ").split(" ")
    if (periodArray.length == 0) {
        periodArray = ["0000-01-01", "9999-12-31"];
    } else if (periodArray.length < 2) {
        periodArray.push("9999-12-31");
    }

    // フォームに入力されている内容をlocalStorageに保存する
    saveForms();

    /*
     * toot取り出しのための初期設定
     */
    process_time = getFormattedTime()
    _$("#process_time").innerText = process_time;

    const status = getStatus(instance, token);
    // console.log(status);
    _$("#progress").max = status.statuses_count;

    $("#spinner").toggleClass("d-none");

    // Mastodon APIは5分間に300回まで呼び出せる
    // 5 * 60 = 300 なので、1秒ごとに1回のペースで呼び出せば呼び出し上限にはかからないはず
    // 念のため 1.2病に1回API呼び出しを行う
    timer = setInterval(getEntries, 1200, instance, token, periodArray[0], periodArray[1], status);
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
 * @param {*} token アクセストークン
 * @returns toot内容のJSON
 */
function getStatus(instance, token) {
    let r = new XMLHttpRequest();
    r.open("GET",instance+'/api/v1/accounts/verify_credentials',false);
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
    // アンカータグの作成
    const downLoadLink = document.createElement("a");

    // ダウンロードするHTML文章の生成
    const outputDataString = JSON.stringify(globalJson);
    const downloadFileName = _$("#username").value + " toots (" + _$("#period").value + ").json";
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
    // アンカータグの作成
    const downLoadLink = document.createElement("a");

    // ダウンロードするHTML文章の生成
    const outputDataString = "<html><head><meta charset='utf-8'><style>.boost{border:2px solid #009af4;border-radius:4px;background-color:#fff;margin:15px;padding:15px}.toot{border:2px solid #52b03b;border-radius:4px;background-color:#fff;margin:15px;padding:15px}#progress{display:inline}.time{background-color:#fff}</style></head><body>" + _$("#result").innerHTML + "</body></html>";
    const downloadFileName = _$("#username").value + " toots (" + _$("#period").value + ").html";
    const filetype = "application/json";
    downLoadLink.download = downloadFileName;
    downLoadLink.href = URL.createObjectURL(new Blob([outputDataString], { type: filetype }));
    downLoadLink.dataset.downloadurl = [filetype, downloadFileName, downLoadLink.href].join(":");
    downLoadLink.click();
}

/**
 * tootを取り出して、HTMLに表示する。setTImeoutで1.2秒ごとに呼び出される
 * @param {*} instance https://qiitadon.com など、インスタンスのURL
 * @param {*} token アクセストークン
 * @param {*} period_start '2021-01-01' など、取得する期間の開始日
 * @param {*} period_end '2021-12-31' など、取得する期間の終了日
 * @param {*} status APIで取得したユーザー情報
 */
function getEntries(instance, token, period_start, period_end, status) {

    let prog = _$("#progress");

    //　現在までに取得しているtootの最大ID。これを指定してより過去のtootを取得するAPIを呼び出す
    let strMaxId = "";
    if (minId >= 0) {
        strMaxId = "&max_id=" + minId;
    }

    let r = new XMLHttpRequest();
    r.onload = () => {
        let json = JSON.parse(r.responseText);

        // APIの結果に自分のtootが含まれていれば処理を行う
        if (Object.keys(json).length) {
            if (json.error) {
                pop_error(json.error);
                return;
            }

            // APIで取得した最大40件のtootを分解する
            try {
                json.forEach((toot) => {
                let day = toot.created_at.replace(/[A-Z].+$/, "");

                // 指定した期間内のtootのみ表示する
                    if (period_start <= day && day <= period_end) {
                        globalJson.push({
                            "created_at": toot.created_at,
                            "content": toot.content,
                            "url": toot.url,
                            "media_attachments": toot.media_attachments
                        });
                        showEntries(toot);
                    }
                    _$("#now-date").innerText = toot.created_at;

                    // console.log(prog.value + "/" + prog.max);
                    let link = r.getResponseHeader("Link");
                    if (/max_id=\d+/.test(link)) {
                        minId = link.match(/max_id=\d+/)[0].replace(/max_id=/, "");
                        prog.value += 1;
                        _$("#prog-num").innerHTML = Math.floor(prog.value / prog.max * 100) + "%";
                    } else {
                        clearInterval(timer);
                        _$("#prog-num").innerHTML = "100%";
                        $("#spinner").toggleClass("d-none");
                        _$("#process_time").innerText = process_time + " - " + getFormattedTime();
                        // ループを抜ける
                        throw new Exception();
                    }
                    if (day < period_start) {
                        console.log(day + ", " + period_end);
                        clearInterval(timer);
                        prog.value = prog.max;
                        _$("#prog-num").innerHTML = "100%";
                        $("#spinner").toggleClass("d-none");
                        _$("#process_time").innerText = process_time + " - " + getFormattedTime();
                        // ループを抜ける
                        throw new Exception();
                    }
                });
            } catch (e) {
                // ループを抜ける
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
        console.log(elem);
        let tmp = elem.split(" ");
        console.log(tmp[0], tmp[1]);
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
    s.setItem('username', _$('#username').value.trim());
    s.setItem('token', _$('#token').value.trim());
    s.setItem('period', _$('#period').value.trim());
}

/**
 * フォームの内容をブラウザから読み込む
 */
 function loadForms() {
    let s = localStorage;
    _$('#instance').value = s.getItem('instance');
    _$('#username').value = s.getItem('username');
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
    minId = -1;
    globalJson = [];
    timer = null;
    process_time = "";
    _$('#result').innerHTML = "";
}
