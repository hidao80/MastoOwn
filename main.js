var minId = -1;
var globalJson = [];

function search(isAll) {
    let entries;
    let username = document.querySelector("#username").value.trim();
	let instance = document.querySelector('#instance').value;
	let token = document.querySelector('#token').value;
	if(!username){pop_error('User name is empty.'); return;}
	if(!instance){pop_error('Instance is empty.'); return false;}
	if(!token){pop_error('Token is empty.'); return false;}

	let uid = getUid(instance, token);

	document.querySelector('#progress').style.visibility = "visible";
    do {
		entries = getEntries(instance, token, uid);

		if (entries) {			
			let json = JSON.parse(entries);
			let preId = minId;

			if (json.error) {pop_error(json.error); clearTimeout(timerId); return;}
			json.forEach( (toot) => {
				showEntries(toot);
				globalJson.push({"created_at": toot.created_at, 
									"content": toot.content,
									"url":	toot.url,
									"media_attachments": toot.media_attachments});
				minId = toot.id;
			});
		}
	} while (entries && isAll);
	document.querySelector('#progress').style.visibility = "hidden";
}

function getUid(instance, token) {
	let r = new XMLHttpRequest();
	r.open("GET",instance+'/api/v1/accounts/verify_credentials',false);
	r.setRequestHeader("Authorization", "Bearer " + token);
	r.send(null);

	console.log(r.responseText);

	let json = JSON.parse(r.responseText);
	if (json) {
		return json.id;
	} else {
		return 0;
	}
}

function getJson() {
	var href = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(globalJson));
	location.href = href;
}

function getEntries(instance, token, uid) {
	let strMaxId = "";
	if (minId >= 0) strMaxId = "&max_id="+minId;
	
	console.log(strMaxId);
	
	let r = new XMLHttpRequest();
	r.open("GET",instance+'/api/v1/accounts/'+uid+'/statuses?limit=40'+strMaxId,false);
	r.setRequestHeader("Authorization", "Bearer " + token);
	r.send(null);

	console.log(r.responseText);

	return r.responseText;
}

function getImages(toot) {
	var imagesUrl = new Array();
	toot.media_attachments.forEach( (item) => {
		imagesUrl.push(item.preview_url + " " + item.url);
	});
	
	let retValue = "";
	let index = 1;
	imagesUrl.forEach( (elem) => {
		console.log(elem);
		let tmp = elem.split(" ");
		console.log(tmp[0],tmp[1]);
		retValue += "<a href='" + tmp[1] + "' target='_brank'><img src='" + tmp[0] + "' width='256' height='256' alt='添付画像" + index++ + "'></a>";
	});
	
	return retValue;
}

function pop_error(msg){
    console.log(msg);
    alert(msg);
}

function showEntries(toot){
	document.querySelector('#result').innerHTML 
		+= "<div class='toot'>"
		+ "<p><span>"
		+ toot.account.username 
		+ "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;toot id:" 
		+ toot.id + "</span></p>"
		+ "<p>" + toot.content + "</p>"
		+ "<p>" + getImages(toot) + "</p>"
		+ "</div>";
}
