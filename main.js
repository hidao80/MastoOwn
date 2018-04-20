var minId = -1;
var globalJson = [];
var timer = null;

function search() {
	timer = setInterval(getEntries, 2000);
}

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

function getJson() {
	var href = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(globalJson));
	location.href = href;
}

function getEntries() {
	let username = document.querySelector("#username").value.trim();
	let instance = document.querySelector('#instance').value.trim();
	let token = document.querySelector('#token').value.trim();

	if(!username){pop_error('User name is empty.'); return;}
	if(!instance){pop_error('Instance is empty.'); return false;}
	if(!token){pop_error('Token is empty.'); return false;}

	let status = getStatus(instance, token);
	let prog = document.querySelector("#progress")
	
	prog.max = status.statuses_count;

	let strMaxId = "";
	if (minId >= 0) strMaxId = "&max_id="+minId;

	let r = new XMLHttpRequest();
	r.onprogress = (pe) => {
		if(pe.lengthComputable) {
		}
	};
	r.onload = () => {
		let json = JSON.parse( r.responseText );

		if (Object.keys(json).length) {
			if (json.error) {
				pop_error(json.error);
				return;
			}
			json.forEach( (toot) => {
				globalJson.push({"created_at": toot.created_at, 
									"content": toot.content,
									"url":	toot.url,
									"media_attachments": toot.media_attachments});
				showEntries(toot);
			});

			let link = r.getResponseHeader("Link");
			if (/max_id=\d+/.test(link)) {
				minId = link.match(/max_id=\d+/)[0].replace(/max_id=/,"");
				prog.value += 40;
			} else {
				clearInterval(timer);
			}
		}
	};
	r.open("GET",instance+'/api/v1/accounts/'+status.id+'/statuses?limit=40'+strMaxId,true);
	r.setRequestHeader("Authorization", "Bearer " + token);
	r.send(null);
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
	let cls = "toot";
	if (/^<p>RT\s</.test(toot.content)) {
		cls = "boost"; 
	} else {
		cls = "toot"; 
	}
	document.querySelector('#result').innerHTML 
		+= "<div class='" + cls + "'>"
		+ "<p><span>"
		+ toot.account.username 
		+ "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;toot id:" 
		+ toot.id + "</span></p>"
		+ "<p>" + toot.content + "</p>"
		+ "<p>" + getImages(toot) + "</p>"
		+ "</div>";
}

function hiddenBoost() {
	let list = document.querySelectorAll(".boost");

	if (document.querySelector("#hidden-boost").checked) {
		list.forEach((elem) => {
			elem.style.display = "none";
		});
	} else {
		list.forEach((elem) => {
			elem.style.display = "block";
		});
	}
}
