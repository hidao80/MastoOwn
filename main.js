var minId = -1;

function search() {
	let json = JSON.parse(getEntries());
	json.forEach( (toot) => {
		if (toot.application.name !== "Qithub-BOT") {
			document.querySelector('#result').innerHTML 
				+= "<div class='toot'><p>" + toot.account.username + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;toot id:" + toot.id + "</span></p>"
				+ "<p>" + toot.content + "</p></div>";
			minId = toot.id;
		}
	});
}

function getEntries() {
	let q = document.querySelector('#tag').value;
	let instance = document.querySelector('#instance').value;
	let strMaxId = "";
	if (minId >= 0) strMaxId = "&max_id="+minId;
	let r = new XMLHttpRequest();
	r.open("GET",instance+'/api/v1/timelines/tag/'+q+'?local=true&limit=40'+strMaxId,false);
	r.send(null);
	console.log(r.responseText);

	return r.responseText;
}
