$(document).ready(function(){
	loadStopWords();
	window.records = [];
	$("#inputBox").keypress(function(e){
	    if(e.keyCode==13){
	        $("#recordButton").click();
	        $("#inputBox,#bigTextInput").val("");
	    }
	});
	$("#bigTextInput").hide();
	$("#bigInputCheck").click(function(){
		$("#inputBox").toggle(!this.checked).val("");
		$("#bigTextInput").toggle(this.checked).val("");
	});

	window.setInterval(function(){
		onTestBoxInput()
	}, 500);
});

function loadStopWords(){
	$.ajax({
		url: "stopwords.jsonp",
		dataType: "jsonp",
		jsonpCallback: "getStopWords",
		success: function(data){
			window.stopwords = data.stopwords;
		},
		error: function(jqXHR, textStatus, errorThrown){
			console.log("jqXHR: " + jqXHR);
			console.log("textStatus: " + textStatus);
			console.log("error: " + errorThrown);
		}
	});
}

function wordIsEmoticon(word){
	//first handle special cases
	if(word == "xd" || word == "x3") {return true;}

	//word is emoticon if >50% of the word is made up of special characters
	var specialCharacters = word.replace(/[^a-z0-9]/gmi, "");
	return ((specialCharacters.length / word.length)*100 <= 50)?(true):(false)

}

function onTestBoxInput(){
	var inList = false;
	var inputBeforeSplit = $("#testBox").val().toLowerCase()
	var testWords = inputBeforeSplit.split(" ");
	var testFrequencies = [];
	var placeInSortedList = 0;
	for(var wordIndex = 0; wordIndex < testWords.length; wordIndex++){
		for(var exIndex = 0; exIndex < excludeList.length; exIndex++){
			inList = (excludeList[exIndex] == testWords[wordIndex] || inList == true)?(true):(false);
		}
		if(wordIsEmoticon(testWords[wordIndex])){
			//this word is an emoticon, denoting emotion
			//remove this from phrase commonness
			inList = true;
		}
		if(!inList){
			placeInSortedList = wordInFrequencyList(testWords[wordIndex],window.sortedFrequency);
			if(placeInSortedList >= 0) {
				testFrequencies.push(window.sortedFrequency[placeInSortedList][1]);
			}
		}
	}
	if(inputBeforeSplit.indexOf("?") > -1){
		//asking a question means phrase commonness should drop significantly
		testFrequencies.push(0.01);
	}
	var totalFrequency = 0;
	if(testFrequencies.length > 0){
		for(var frequencyIndex = 0; frequencyIndex < testFrequencies.length; frequencyIndex++){
			totalFrequency += testFrequencies[frequencyIndex];
		}
	}
	
	totalFrequency /= testFrequencies.length
	if(totalFrequency > 0.01){
		document.getElementById("testBoxOutput").innerHTML = totalFrequency.toFixed(2) + "%";
	} else {
		document.getElementById("testBoxOutput").innerHTML = "00.00%"
	}

}

var excludeList = [" ","","\n",".",",","?","!","\"","'","/","\\",":","(",")","[","]","^"]

function record(){
	var linedInput = $(
			($("#inputBox").is(":visible")) //if inputBox is visible
				?	("#inputBox")   //then use inputBox
				:	("#bigTextInput")//else use bigTextInput (textArea)
			).val().split("\n");
	
	$.each(linedInput,function(index,value){ //for each line
		var splitOnSpace = value.split(" ");
		$.each(splitOnSpace, function (wordIndex, wordValue) { //for each word
			var inList = false;
			/*for(var exIndex = 0; exIndex < excludeList.length; exIndex++){
				inList = (excludeList[exIndex] == wordValue || inList == true)?(true):(false);
			}*/
		    	if(!inList){
				/*
					The next two IF statements exist due to artifacts of IFTTT recording text messages.
					This is my primary source of input, and many lines will have a trailing or leading useless quote mark.
					If your input contains quoted texts consider removing them entirely.
					I suggest this in case the input is, like mine, from text messages as quoted text is not 'from' the person.
					This would mean that the quoted text may not follow the same pattern as the rest of the input, and could throw the numbers off.
					By all means remove these and the result may very well be the same.
				*/
				if(wordValue.charAt(0) == "\""){
					wordValue = wordValue.substring(1);
				}
				if(wordValue.charAt(wordValue.length-1)=="\""){
					wordValue = wordValue.substring(0, wordValue.length-1);
				}
				if(	wordValue.charAt(wordValue.length-1)=="?" || 
					wordValue.charAt(wordValue.length-1)=="." || 
					wordValue.charAt(wordValue.length-1)=="!"){

					wordValue = wordValue.substring(0, wordValue.length-1);
				}
				if(!valueIsStopWord(wordValue.toLowerCase())) window.records.push(wordValue.toLowerCase());
		    	}
		});
		$("#listId").append("<li>" + value + "</li>");
	});
	$("#bigTextInput").val("");
	initiateAfterRecord();
}

function valueIsStopWord(value){
	for(var stopIndex = 0; stopIndex < window.stopwords.length; stopIndex++){
		if(value == window.stopwords[stopIndex][stopIndex]) return true;
	}
	return false;
}

function initiateAfterRecord(){
	var startTime = new Date();
	window.rankedFrequency = rankWordFrequencyUnordered(window.records);
	var endTime = new Date();
	console.log("runtime in ms: " + (endTime - startTime));
	window.sortedFrequency = mergeSort(rankedFrequency);
}

function wordFrequency(givenWord){
	var occurrences = 0;
	var matchResults = [];
	//console.log("word frequency for " + givenWord);

	$.each($(window).attr("records"),function(index,value){ //for each recorded word
		if(value.toLowerCase() == givenWord.toLowerCase()){
			occurrences++;
		}
	});
	
	var returnPercentage = ((occurrences / $(window).attr("records").length*100)||0).toFixed(2)
	return parseFloat(returnPercentage)
}

function mergeSort(inArray){
	if(inArray.length<=1) return inArray;
	
	var leftArray = [];
	var rightArray = [];
	var midPoint = inArray.length / 2;
	
	//populate left and right arrays
	for(var item = 0; item < inArray.length; item++){
		if(item < midPoint){ leftArray.push(inArray[item]); }
		else { rightArray.push(inArray[item]); }
	}

	//sort each smaller list
	leftArray = mergeSort(leftArray);
	rightArray = mergeSort(rightArray);

	//combine(merge) smaller sorted lists
	return merge(leftArray, rightArray);
}

function merge(leftArray, rightArray){
	var mergedArray = [];

	while(leftArray.length != 0 && rightArray.length != 0)
	{
		if(leftArray[0][1] <= rightArray[0][1]){ 
			mergedArray.push(leftArray[0]);
			leftArray.shift();
		} else {
			mergedArray.push(rightArray[0]);
			rightArray.shift();
		}
	}

	while(leftArray.length != 0){
		mergedArray.push(leftArray[0]);
		leftArray.shift();
	}
	while(rightArray.length != 0){
		mergedArray.push(rightArray[0]);
		rightArray.shift();
	}

	return mergedArray;
	
}

function rankWordFrequencyUnordered(rankedArray){
	var unorderedFrequency = [];
	
	$.each(rankedArray, function (index, value) {
		//console.log("Processing word \"" + value + "\"");
		if(wordInFrequencyList(value,unorderedFrequency)== -1){
			//new word, find frequency, add to list
			unorderedFrequency.push([value,wordFrequency(value)]);
		}
	});

	return unorderedFrequency;
}


function wordInFrequencyList(word, list){
	for(var index = 0; index < list.length; index++){
		if(list[index][0] == word.replace(new RegExp((word[0]==":")?('[,?.!"]'):('[,?.!)"(]'), 'g'))) return index;
	}
	return -1;
}

function jQueryInArray(ArrayToSearch, SampleArrayItemToSearchFor){
	return $.inArray(SampleArrayItemToSearchFor.replace(new RegExp('[,?.!)(]', 'g'), ''), ArrayToSearch);
}
