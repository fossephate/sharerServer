



let socket = io("https://remotegameshare.com", {
    path: "/8110/socket.io",
    transports: ["websocket"],
});

socket.on("connection", function(socket){
    // socket.join("viewers");
});

var clipboard = new ClipboardJS(".btn");

clipboard.on("success", function(e) {
	console.info("Action:", e.action);
	console.info("Text:", e.text);
	console.info("Trigger:", e.trigger);
	e.clearSelection();
});

tippy("[title]", {
	delay: 10,
	arrow: true,
	duration: [350, 300],
	flip: true,
	placement: "top",
	size: "regular",
	trigger: "click manual",
});

$("#generateDownload").on("click", function(event) {
	socket.emit("generateDownload");
});

socket.on("downloadReady", function(data) {
	$("#clientURL").val(data.clientURL);
	$("#hostURL").val(data.hostURL);
	
	let unique = data.unique;
	let connectURL = "https://remotegameshare.com/connect/?code=" + data.unique;
	$("#connectURL").attr("href", connectURL);
	swal("The download is ready!");
});






