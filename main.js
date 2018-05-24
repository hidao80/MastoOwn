var minId = -1;
var globalJson = [];
var timer = null;

function search() {
	timer = setInterval(getEntries, 2000);
}

function $(id) {
	return document.querySelector(id);
}

function getStatus(instance, token) {
	let r = new XMLHttpRequest();
	r.open("GET",instance+'/api/v1/accounts/verify_credentials',false);
	r.setRequestHeader("Authorization", "Bearer " + token);
	r.send(null);

	return JSON.parse(r.responseText);
}

function getJson() {
	var href = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(globalJson));
	location.href = href;
}

function getEntries() {
	let username = $("#username").value.trim();
	let instance = $('#instance').value.trim();
	let token = $('#token').value.trim();
	let period = $('#period').value.trim();

	if(!username){pop_error('User name is empty.'); return;}
	if(!instance){pop_error('Instance is empty.'); return false;}
	if(!token){pop_error('Token is empty.'); return false;}

	let periodArray = period.replace(/^(?!.*(\d+|-+)).*$/, "").replace(/\s+/," ").split(" ")

	let status = getStatus(instance, token);
	let prog = $("#progress");
	
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
				let day = toot.created_at.replace(/[A-Z]+$/,"");
				if (period != null && periodArray[0] <= day && day <= periodArray[1]) {
					globalJson.push({"created_at": toot.created_at, 
									"content": toot.content,
									"url":	toot.url,
									"media_attachments": toot.media_attachments});
					showEntries(toot);
				}
			});

			let link = r.getResponseHeader("Link");
			if (/max_id=\d+/.test(link)) {
				minId = link.match(/max_id=\d+/)[0].replace(/max_id=/,"");
				prog.value += 40;
				$("#prog-num").innerHTML = Math.floor(prog.value / prog.max * 100) + "%";
			} else {
				clearInterval(timer);
				$("#prog-num").innerHTML = "100%";
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
	$('#result').innerHTML 
		+= "<div class='" + cls + "'>"
		+ "<p><span>"
		+ toot.account.username 
		+ "&nbsp;&nbsp;&nbsp;toot id:" 
		+ toot.id + "&nbsp;&nbsp;&nbsp;created_at:" + toot.created_at + "</span></p>"
		+ "<p>" + toot.content + "</p>"
		+ "<p>" + getImages(toot) + "</p>"
		+ "</div>";
}

function hiddenBoost() {
	if ($("#hidden-boost").checked) {
		document.styleSheets[0].cssRules[0].style.display = "none";
	} else {
		document.styleSheets[0].cssRules[0].style.display = "block";
	}
}

function saveForms() {
	let s = localStorage;
	s.setItem('instance', $('#instance').value.trim());
	s.setItem('username', $('#username').value.trim());
	s.setItem('token', $('#token').value.trim());
	s.setItem('period', $('#period').value.trim());
}

function loadForms() {
	let s = localStorage;
	$('#instance').value = s.getItem('instance');
	$('#username').value = s.getItem('username');
	$('#token').value = s.getItem('token');
	$('#period').value = s.getItem('period');
}
