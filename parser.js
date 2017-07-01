var request = require('request');
var latex = require('node-latex');
var fs = require('fs');

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.split(search).join(replacement);
};

function checkError(error) {
	if(error) {
		process.stdout.write('\n');
		console.error(error.stack);
		process.exit(1);
	}
}

function saveJSON(array) {
	process.stdout.write("Info: salveaza intrebari.json local...");
	fs.writeFileSync('intrebari.json', JSON.stringify(array, null, 4), 'utf8', function(error){
		checkError(error);
	});
	process.stdout.write(" OK\n");
}

function parseText(string, fixed) {
	// prelucreaza textul din resursa
	var intrbPars = [];
	if(fixed) {
		// daca e de fix 10 intrebari
		process.stdout.write("Info: preluare intrebari...");
		// imparte textul dupa numerele intrebarilor
		var textRaw = string.replaceAll("\r", "").replaceAll("<nowiki>", "").replaceAll("</nowiki>", "").trim().split(/[0-9]+\) /);
		intrbPars = getQuestions(textRaw, false);
		process.stdout.write(" OK\n");
	} else {
		// daca e variat si cu intrebari random
		// extrage metadatele si retine textul fara metadate
		process.stdout.write("Info: preluare metadate...");
		var cleanText = getMetadata(string);
		// extrage categoriile si intrebarile din categorii
		process.stdout.write("Info: preluare categorii...");
		intrbPars = getCategoriesAndQuestions(cleanText);
	}
	return intrbPars;
}

function getMetadata(string) {
	// imparte textul in linii si parcurge liniile cu metadate
	var lines = string.split("\n");
	var index = 0;
	for(var i=0; i<lines.length; i++) {
		// daca linia incepe cu o metadata
		// parseaza datele prezente
		if(lines[i].startsWith("  * **")) {
			var token = lines[i].replace("  * ", "").replaceAll("*", "").split(" ");
			categorii[token[0].toLowerCase()] = parseInt(token[1]);
		} else {
		// daca s-au terminat liniile cu metadate
		// incrementeaza indexul cu locatia ultimelei linii + 2*\n
			index += string.indexOf(lines[i-1])+lines[i-1].length+1;
			index += 2;
			process.stdout.write(" OK\n");
			break;
		}
	}
	// intoarce stringul initial, cu exceptia metadatelor
	return string.substring(index, string.length);
}

function getCategoriesAndQuestions(string) {
	var intrbAll = [];
	// imparte textul ramas in nume de categorii si categorii
	var ctgRaw = string.split("===");
	process.stdout.write(" OK\n");
	for(var i=1; i<ctgRaw.length; i+=2) {
		var nume = ctgRaw[i].toLowerCase().trim();
		// daca categoria este prezenta in metadate si >0
		if(categorii[nume]) {
			// formeaza un array cu toate intrebarile din categorie
			process.stdout.write("Info: preluare intrebari din '"+nume+"'...");
			var textRaw = ctgRaw[i+1].trim().replaceAll("\r", "").replaceAll("<nowiki>", "").replaceAll("</nowiki>", "").split("==");
			var textRaw2 = [];
			for(var j=0; j<textRaw.length; j+=2) {
				if(textRaw[j] === "") continue;
				textRaw2.push(textRaw[j-1].trim()+"##"+textRaw[j].trim());
			}
			var intrbCat = getQuestions(textRaw2, true);
			process.stdout.write(" OK\n");
			// verifica conditii de baza nrIntrebariTotal >= nrIntrebariExtrase
			var intrbCatLength = intrbCat.length;
			var intrbCatExtrase = categorii[nume];
			if(intrbCatLength < intrbCatExtrase) {
				console.log("Error: '"+nume+"': gasite: "+intrbCatLength+" | de extras: "+intrbCatExtrase);
				process.exit(1);
			}
			// adauga categoria la intrebari
			intrbCat.map(function(o) { o.categorie = nume; });
			// extrage intrebari random
			while(categorii[nume]) {
				var random = Math.floor(Math.random() * intrbCat.length);
				intrbAll.push(intrbCat.splice(random, 1)[0]);
				categorii[nume]--;
			}
			console.log("Info: '"+nume+"': gasite "+intrbCatLength+" | extrase "+intrbCatExtrase);
		}
	}
	return intrbAll;
}

function getQuestions(array, checkWriter) {
	var intrbCat = [];
	// parcurge si completeaza datele intrebarii
	for(var i=0; i<array.length; i++) {
		if(array[i] === "") continue;
		var intrb = {};
		// seteaza autor intrebare
		var nextText = array[i];
		if(checkWriter) {
			var autor = array[i].split("##")[0];
			nextText = array[i].replace(autor, "").replace("##", "");
			if(autor.startsWith("Varianta "))
				autor = autor.replace("Varianta ", "");
			intrb.autor = autor;
		}
		// imparte textul intrebarii + variante de raspuns
		var textRaw = nextText.split("\n\n");
		// seteaza text intrebare
		intrb.text = textRaw[0].trim();
		// imparte variantele de raspuns
		var varianteRaw = textRaw[1].split("|");
		// seteaza variantele de raspuns si varianta corecta
		intrb.variante = {};
		var litera = 97;
		for(var j=0; j<varianteRaw.length; j++) {
			if(varianteRaw[j] === "") continue;
			if(varianteRaw[j].indexOf("(*)") != -1) intrb.corect = String.fromCharCode(litera);		
			intrb.variante[String.fromCharCode(litera)] = varianteRaw[j].replace("(*)", "").trim();
			litera++;
		}
		intrbCat.push(intrb);
	}
	return intrbCat;
}

function makePDF(array) {
	if(array.length == 10) {
		var context = '';
		// set preamble
		context += '\\documentclass[11pt]{article}\n\n';
		
		context += '\\usepackage[utf8]{inputenc}\n';
		context += '\\usepackage{enumerate}\n';
		context += '\\usepackage{flushend}\n';
		context += '\\usepackage[margin=0.3in]{geometry}\n';
		context += '\\usepackage{fancyhdr}\n';
		context += '\\fancyhead{}\n\n';

		context += '\\usepackage{algorithm,algorithmic}\n';
		context += '\\usepackage{caption}\n';
		context += '\\usepackage{amsmath}\n';
		context += '\\usepackage{amssymb}\n';
		context += '\\usepackage{ifthen}\n\n';

		context += '\\lhead{\\ifthenelse{\\value{page}=1}{Nume si prenume \\ldots \\ldots \\ldots \\ldots \\ldots \\\\ Grupa: \\ldots \\ldots \\ldots \\ldots \\ldots \\ldots \\ldots \\ldots}{} }\n';
		context += '\\rhead{\\ifthenelse{\\value{page}=1}{\\vspace{30pt} $\\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|}\\hline Exercitiu & 1\\;\\;\\;& 2\\;\\;\\;& 3\\;\\;\\;& 4\\;\\;\\;& 5\\;\\;\\;& 6\\;\\;\\;& 7\\;\\;\\;& 8\\;\\;\\;& 9\\;\\;\\;& 10\\;\\;\\;\\\\ \\hline Raspuns & & & & & & & & & & \\\\ \\hline \\end{array}$}{}}\n';
		context += '\\title{\\vspace{5pt}Test \\vspace{-40pt}}\n';
		context += '\\date{}\n\n';

		context += '\\newcommand{\\concat}{\\textnormal{{\\tiny{++}}}}\n';
		context += '\\newcommand{\\solvebox}[1]{\\newline\\fbox{\\begin{minipage}{7.5in} \\hfill\\vspace{#1 pt} \\end{minipage} }}\n';
		context += '\\newcommand\\tab[1][1cm]{\\hspace*{#1}}\n';
		context += '\\newcommand{\\lb}{\\textbackslash}\n\n';

		// start document
		context += '\\begin{document}\n';
		context += '\\maketitle\n';
		context += '\\thispagestyle{fancy}\n\n';

		// build questions
		var exclude = 0;
		for(var i=0; i<array.length; i++) {
			// imparte textul intrebarii in functie de numarul de linii
			var textSplit = array[i].text.replace("\\\\", "").split("\n");
			// daca textul este lung
			if(textSplit.length > 2) {
				var first = true;
				for(var j=0; j<textSplit.length; j++) {
					// tine cont de zonele cu <code></code>
					// folosesc exclude si first pentru a le delimita
					if(textSplit[j].indexOf("<code>") > -1) exclude = 1;
					if(textSplit[j].indexOf("</code>") > -1) exclude = 2;
					if(j==0) {
						context += (i+1)+'. '+textSplit[j]+'\n\n';
					} else {
						if(exclude == 1) {
							if(!first) context += '\\hspace*{1.5em}';
							context += '\\tab '+textSplit[j].replace("  -", "").replace("<code>", "\\texttt{").replace("</code>", "}").trim()+'\\\\\n';
							first = false;
						} else if(exclude == 2) {
							context += '\\hspace*{1.5em}\\tab '+textSplit[j].replace("  -", "").replace("<code>", "\\texttt{").replace("</code>", "}").trim()+'\n';
							exclude = 0;
						} else {
							context += '\\tab '+j+') \\texttt{'+textSplit[j].replace("  -", "").trim()+'}\n\n';
						}
					}
				}
			// daca textul este scurt
			} else {
				for(j=0; j<textSplit.length; j++) {
					if(j==0) {
						context += (i+1)+'. '+textSplit[j]+'\n\n';
					} else {
						context += '\\tab \\texttt{'+textSplit[j]+'}\n\n';
					}
				}
			}
			// completeaza variante de raspuns
			context += '\n\\vspace{2mm}';
			context += '\\tab ';
			for(var property in array[i].variante)
				context += property.toUpperCase()+')  '+array[i].variante[property]+' \\quad\\quad ';
			context += '\n\n';
			context += '\\vspace{4mm}\n';
		}

		// end document
		context += '\\thispagestyle{empty}\n';
		context += '\\setlength{\\headheight}{-0pt}\n';
		context += '\\end{document}\n';

		// write latex file
		fs.writeFile('test.tex', context, function(err) {
			checkError(err);
			var input = fs.createReadStream('test.tex');
			var output = fs.createWriteStream('test.pdf');
			latex(input).pipe(output);
			process.stdout.write(" OK\n");
		});
	} else {
		process.stdout.write("Error: Nu sunt 10 intrebari!");
		process.exit(1);
	}
}

// verifica numarul de argumente
if(process.argv.length <= 4 && process.argv.length >= 3) {
	var categorii = {};
	var intrebari = [];
	// prelucreaza argumentele
	var online = 0;
	var marimeFixa = 0;
	// verifica daca a primit clean
	if(process.argv[2].toLowerCase().localeCompare("clean") == 0) {
		process.stdout.write("Info: sterge fisiere temporare...");
		try {
			fs.unlinkSync('intrebari.json');
		} catch (err) {
			if(err.code !== 'ENOENT') checkError(err);
		}
		try {
			fs.unlinkSync('test.tex');
		} catch (err) {
			if(err.code !== 'ENOENT') checkError(err);
		}
		try {
			fs.unlinkSync('test.pdf');
		} catch (err) {
			if(err.code !== 'ENOENT') checkError(err);
		}
		process.stdout.write(" OK\n");
		process.exit(0);
	}
	// verifica daca a primit link
	if(process.argv[2].toLowerCase().startsWith("http")) online = 1;
	// verifica daca a primit fixed
	if(process.argv[3]) marimeFixa = 1;
	// prelucreaza resursa de input
	if(online) {
		// daca e online
		process.stdout.write("Info: preluare resursa online...");
		var separator = "&";
		if(process.argv[2].indexOf("?") == -1) separator="?";
		// obtine pagina de dokuwiki
		request(process.argv[2]+separator+"do=export_raw", function(error, response, body){
			checkError(error);
			if(response.statusCode == 200) {
				process.stdout.write(" OK\n");
				// incepe parsatul
				intrebari = parseText(body, marimeFixa);
				// salveaza rezultatul pentru verificatul raspunsurilor
				saveJSON(intrebari);
				process.stdout.write("Info: generare fisier PDF...");
				// genereaza pdful
				makePDF(intrebari);
			} else {
				process.stdout.write("Error: Status Code: "+response.statusCode);
				process.exit(1);
			}
		});
	} else {
		// daca e offline
		process.stdout.write("Info: preluare resursa locala...");
		fs.readFile(process.argv[2], 'utf8', function(error, data){
			checkError(error);
			process.stdout.write(" OK\n");
			// incepe parsatul
			intrebari = parseText(data, marimeFixa);
			// salveaza rezultatul pentru verificatul raspunsurilor
			saveJSON(intrebari);
			process.stdout.write("Info: generare fisier PDF...");
			// genereaza pdful
			makePDF(intrebari);
		});
	}
// exemple de usage a comenzii
} else {
	console.log("Comanda incorecta!");
	console.log("Folosire parser:");
	console.log("- node parser.js path");
	console.log("- node parser.js path fixed");
	console.log("- node parser.js url");
	console.log("- node parser.js url fixed");
}
