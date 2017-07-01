var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = [
  'https://www.googleapis.com/auth/drive', 
  'https://www.googleapis.com/auth/drive.file', 
  'https://www.googleapis.com/auth/spreadsheets'
];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), genCatalog);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function genCatalog(auth) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nRealizarea automata a templateului de rezultate finale necesita urmatoarele informatii:');
  console.log(' - Pentru copiat date deja existente (numele studentilor si notele de pe parcurs): spreadsheet id + sheet name + rangeul cu nume + rangeul cu note');
  console.log(' - Pentru generat sheetul final: spreadsheet id + sheet name + string cu raspunsuri corecte');

  console.log('\nDate necesare pentru copiat datele existente (nume studenti + note studenti):');
  rl.question('Introduceti IDul spreadsheetului (ex: 16bVP8Kwkh_2kBQX9ZfEOW4OD49thqpAQBWl9PtkDKy8): ', function(answer1) {
    rl.question('Introduceti numele sheetului (ex: Sheet2): ', function(answer2) {
      rl.question('Introduceti rangeul pentru numele studentilor (ex: A1:A5): ', function(answer3) {
        rl.question('Introduceti rangeul pentru notele studentilor (ex: B1:B5): ', function(answer4) {
          console.log('\nDate necesare pentru generat sheetul final:');
          rl.question('Introduceti IDul spreadsheetului (ex: 16bVP8Kwkh_2kBQX9ZfEOW4OD49thqpAQBWl9PtkDKy8): ', function(answer5) {
            rl.question('Introduceti numele sheetului (ex: Sheet3): ', function(answer6) {
              rl.question('Introduceti string cu raspunsurile corecte (ex: aaaaaabdac): ', function(answer7) {
                var sheets = google.sheets('v4');
                // pregateste requestul pentru copiat numele si notele studentilor
                var request1 = {
                  spreadsheetId: answer1,
                  majorDimension: 'COLUMNS',
                  ranges: [answer2+'!'+answer3, answer2+'!'+answer4],
                  auth: auth
                };
                // ruleaza queryul pentru copiat numele si notele studentilor
                process.stdout.write('\nInfo: Preia datele deja existente (nume+note)...');
                sheets.spreadsheets.values.batchGet(request1, function(err, response1) {
                  if(err) {
                    console.log('Error: Google Sheets API returned: ' + err);
                    return;
                  }
                  // verifica raspunsul pentru nume
                  if(response1.valueRanges[0].values) {
                    // verifica raspunsul pentru note
                    if(response1.valueRanges[1].values) {
                      // verifica numarul de nume si numarul de note
                      if(response1.valueRanges[0].values[0].length == response1.valueRanges[1].values[0].length) {
                        process.stdout.write(' OK\n');
                        var numeStudenti = response1.valueRanges[0].values[0];
                        var noteParcurs = response1.valueRanges[1].values[0];
                        var lastCell = numeStudenti.length;
                        // pregateste requestul pentru gasit toate sheeturile din spreadsheet
                        var request2 = {
                          spreadsheetId: answer5,
                          includeGridData: false,
                          auth: auth
                        };
                        // ruleaza queryul pentru gasit toate sheeturile din spreadsheet
                        process.stdout.write('Info: Selecteaza sheetul din spreadsheetul final...');
                        sheets.spreadsheets.get(request2, function(err, response2) {
                          if(err) {
                            console.log('Error: Google Sheets API returned: ' + err);
                            return;
                          }
                          // cauta in toate sheeturile prezente sheetul cu numele introdus
                          for(var i=0; i<response2.sheets.length; i++) {
                            if(response2.sheets[i].properties.title.localeCompare(answer6) == 0) {
                              process.stdout.write(' OK\n');
                              // retine sheetId pentru formatare
                              var sheetId = response2.sheets[i].properties.sheetId;
                              // pregateste requestul pentru formatare
                              var request3 = {
                                spreadsheetId: answer5,
                                resource: {
                                  requests: [
                                    // numar de coloane + coloana 1 frozen
                                    {
                                      updateSheetProperties: {
                                        properties: {
                                          sheetId: sheetId,
                                          title: answer6,
                                          gridProperties: {
                                            rowCount: 1000,
                                            columnCount: 33,
                                            frozenColumnCount: 1
                                          }
                                        },
                                        fields: "*"
                                      }
                                    },
                                    // width nume si prenume
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 0,
                                          endIndex: 1
                                        },
                                        properties: {
                                          pixelSize: 310
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // width raspuns
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 1,
                                          endIndex: 2
                                        },
                                        properties: {
                                          pixelSize: 115
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // width raspunsuri corecte
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 2,
                                          endIndex: 14
                                        },
                                        properties: {
                                          pixelSize: 20
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // width O si P
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 14,
                                          endIndex: 16
                                        },
                                        properties: {
                                          pixelSize: 55
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // width raspunsuri date
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 16,
                                          endIndex: 29
                                        },
                                        properties: {
                                          pixelSize: 20
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // width punctaj, parcurs, nota
                                    {
                                      updateDimensionProperties: {
                                        range: {
                                          sheetId: sheetId,
                                          dimension: "COLUMNS",
                                          startIndex: 29,
                                          endIndex: 33
                                        },
                                        properties: {
                                          pixelSize: 65
                                        },
                                        fields: "pixelSize"
                                      }
                                    },
                                    // merge Raspunsuri corecte
                                    {
                                      mergeCells: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 0,
                                          endRowIndex: 2,
                                          startColumnIndex: 16,
                                          endColumnIndex: 29
                                        },
                                        mergeType: "MERGE_ALL"
                                      }
                                    },
                                    // merge string cu raspunsul corect
                                    {
                                      mergeCells: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 1,
                                          endRowIndex: 2,
                                          startColumnIndex: 2,
                                          endColumnIndex: 14
                                        },
                                        mergeType: "MERGE_ALL"
                                      }
                                    },
                                    // merge Raspunsuri date
                                    {
                                      mergeCells: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 0,
                                          endRowIndex: 1,
                                          startColumnIndex: 2,
                                          endColumnIndex: 14
                                        },
                                        mergeType: "MERGE_ALL"
                                      }
                                    },
                                    // merge punctaj (max 40%)
                                    {
                                      mergeCells: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 2,
                                          endRowIndex: 3,
                                          startColumnIndex: 29,
                                          endColumnIndex: 31
                                        },
                                        mergeType: "MERGE_ALL"
                                      }
                                    },
                                    // format bold+center+middle primele 2 linii
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 0,
                                          endRowIndex: 2
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            horizontalAlignment: "CENTER",
                                            verticalAlignment: "MIDDLE",
                                            textFormat: {
                                              bold: true
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(horizontalAlignment, verticalAlignment, textFormat)"
                                      }
                                    },
                                    // format titlu Nume si prenume
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 2,
                                          endRowIndex: 3,
                                          startColumnIndex: 0,
                                          endColumnIndex: 1
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            textFormat: {
                                              bold: true
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(textFormat)"
                                      }
                                    },
                                    // format culoare fundal raspuns
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 2,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: 1,
                                          endColumnIndex: 2
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            backgroundColor: {
                                              red: (255/255),
                                              green: (242/255),
                                              blue: (204/255)
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(backgroundColor)"
                                      }
                                    },
                                    // format linie cu nume si prenume + raspuns pana la final
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 2,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: 2,
                                          endColumnIndex: 33
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            horizontalAlignment: "CENTER"
                                          }
                                        },
                                        fields: "userEnteredFormat(horizontalAlignment)"
                                      }
                                    },
                                    // format punctaj, parcurs si nota cu bold
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 2,
                                          endRowIndex: 3,
                                          startColumnIndex: 29,
                                          endColumnIndex: 33
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            textFormat: {
                                              bold: true
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(textFormat)"
                                      }
                                    },
                                    // format ca number punctaj, parcurs si nota
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 3,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: 29,
                                          endColumnIndex: 33
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            numberFormat: {
                                              type: "NUMBER",
                                              pattern: "#,##0.00"
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat.numberFormat"
                                      }
                                    },
                                    // format culoare fundal parcurs
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 3,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: 31,
                                          endColumnIndex: 32
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            backgroundColor: {
                                              red: (201/255),
                                              green: (218/255),
                                              blue: (248/255)
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(backgroundColor)"
                                      }
                                    },
                                    // format culoare fundal raspunsuri date
                                    {
                                      repeatCell: {
                                        range: {
                                          sheetId: sheetId,
                                          startRowIndex: 3,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: 16,
                                          endColumnIndex: 26
                                        },
                                        cell: {
                                          userEnteredFormat: {
                                            backgroundColor: {
                                              red: (244/255),
                                              green: (199/255),
                                              blue: (195/255)
                                            }
                                          }
                                        },
                                        fields: "userEnteredFormat(backgroundColor)"
                                      }
                                    },
                                    // conditional format pentru punctaj < 2
                                    {
                                      addConditionalFormatRule: {
                                        rule: {
                                          ranges: [
                                            {
                                              sheetId: sheetId,
                                              startRowIndex: 3,
                                              endRowIndex: (lastCell+3),
                                              startColumnIndex: 30,
                                              endColumnIndex: 31
                                            }
                                          ],
                                          booleanRule: {
                                            condition: {
                                              type: "NUMBER_LESS",
                                              values: [
                                                {
                                                  userEnteredValue: "2"
                                                }
                                              ]
                                            },
                                            format: {
                                              backgroundColor: {
                                                red: (244/255),
                                                green: (199/255),
                                                blue: (195/255)
                                              }
                                            }
                                          }
                                        },
                                        index: 0
                                      }
                                    }
                                  ]
                                },
                                auth: auth
                              };
                              var litera = 99;
                              for(var j=0; j<10; j++) {
                                var conditionalFormat = {
                                  addConditionalFormatRule: {
                                    rule: {
                                      ranges: [
                                        {
                                          sheetId: sheetId,
                                          startRowIndex: 3,
                                          endRowIndex: (lastCell+3),
                                          startColumnIndex: (j+16),
                                          endColumnIndex: (j+17)
                                        }
                                      ],
                                      booleanRule: {
                                        condition: {
                                          type: "TEXT_EQ",
                                          values: [
                                            {
                                              userEnteredValue: "=MID(INDIRECT(\"C2\"),"+String.fromCharCode(litera).toUpperCase()+"$3,1)"
                                            }
                                          ]
                                        },
                                        format: {
                                          backgroundColor: {
                                            red: (183/255),
                                            green: (225/255),
                                            blue: (205/255)
                                          }
                                        }
                                      }
                                    },
                                    index: (j+1)
                                  }
                                }
                                request3.resource.requests.push(conditionalFormat);
                                litera++;
                              }
                              // ruleaza queryul pentru formatare
                              process.stdout.write('Info: Formateaza sheetul final...');
                              sheets.spreadsheets.batchUpdate(request3, function(err, response3) {
                                if(err) {
                                  console.log('Error: Google Sheets API returned: ' + err);
                                  return;
                                }
                                process.stdout.write(' OK\n');
                                // pregateste requestul pentru inserat date
                                var request4 = {
                                  spreadsheetId: answer5,
                                  range: answer6+'!A1:AG'+(3+lastCell+3),
                                  valueInputOption: 'USER_ENTERED',
                                  resource: {
                                    values: []
                                  },
                                  auth: auth
                                };
                                // row gol pentru a le instantia pe restul
                                var emptyRow = [];
                                for(j=0; j<33; j++) 
                                  emptyRow.push('');
                                // primul rand cu raspunsuri corecte si date
                                var firstRow = JSON.parse(JSON.stringify(emptyRow));
                                firstRow[2] = 'Raspunsuri corecte';
                                firstRow[16] = 'Raspunsuri date';
                                request4.resource.values.push(firstRow);
                                // al doilea rand cu stringul de raspunsuri corecte ca input
                                var secondRow = JSON.parse(JSON.stringify(emptyRow));
                                secondRow[2] = answer7;
                                request4.resource.values.push(secondRow);
                                // al treilea rand cu informatii generice
                                var thirdRow = JSON.parse(JSON.stringify(emptyRow));
                                thirdRow[0] = 'Nume și prenume';
                                thirdRow[1] = 'Raspuns';
                                for(j=2; j<14; j++)
                                  thirdRow[j] = j-1;
                                thirdRow[29] = 'Punctaj (max 40%)';
                                thirdRow[31] = 'Parcurs';
                                thirdRow[32] = 'Nota';
                                request4.resource.values.push(thirdRow);
                                // randurile cu detaliile studentilor
                                for(j=0; j<numeStudenti.length; j++) {
                                  var studentRow = JSON.parse(JSON.stringify(emptyRow));
                                  // nume student
                                  studentRow[0] = numeStudenti[j];
                                  // raspunsurile corecte
                                  litera = 99;
                                  for(var k=0; k<12; k++) {
                                    studentRow[k+2] = '=MID(INDIRECT("C2"),'+String.fromCharCode(litera).toUpperCase()+'$3,1)';
                                    litera++;
                                  }
                                  // raspunsurile date
                                  litera = 99;
                                  for(var k=0; k<10; k++) {
                                    studentRow[k+16] = '=MID($B'+(j+4)+','+String.fromCharCode(litera).toUpperCase()+'$3,1)';
                                    litera++;
                                  }
                                  // nota pentru examen
                                  studentRow[29] = '=(EXACT($C'+(j+4)+',$Q'+(j+4)+')+EXACT($D'+(j+4)+',$R'+(j+4)+')+EXACT($E'+(j+4)+',$S'+(j+4)+')+EXACT($F'+(j+4)+',$T'+(j+4)+')+EXACT($G'+(j+4)+',$U'+(j+4)+')+EXACT($H'+(j+4)+',$V'+(j+4)+')+EXACT($I'+(j+4)+',$W'+(j+4)+')+EXACT($J'+(j+4)+',$X'+(j+4)+')+EXACT($K'+(j+4)+',$Y'+(j+4)+')+EXACT($L'+(j+4)+',$Z'+(j+4)+'))*0.6+(AA'+(j+4)+'+AB'+(j+4)+'+AC'+(j+4)+')';
                                  // punctajul pentru examen
                                  studentRow[30] = '=AD'+(j+4)+'*0.4';
                                  // nota de parcurs
                                  studentRow[31] = noteParcurs[j];
                                  // nota finala
                                  studentRow[32] = '=AE'+(j+4)+'+AF'+(j+4);
                                  request4.resource.values.push(studentRow);
                                }
                                // rand gol
                                request4.resource.values.push(emptyRow);
                                // rand cu studenti care au sustinut examenul
                                var almostLastRow = JSON.parse(JSON.stringify(emptyRow));
                                almostLastRow[30] = '=COUNTIF(AE4:AE'+(lastCell+3)+',">0")';
                                request4.resource.values.push(almostLastRow);
                                // rand cu studentii picati
                                var lastRow = JSON.parse(JSON.stringify(emptyRow));
                                lastRow[30] = '=COUNTIF(AE4:AE'+(lastCell+3)+',"<2")-COUNTIF(AE4:AE'+(lastCell+3)+',"=0")';
                                request4.resource.values.push(lastRow);
                                process.stdout.write('Info: Completeaza cu date sheetul final...');
                                sheets.spreadsheets.values.update(request4, function(err, response4) {
                                  if(err) {
                                    console.log('Error: Google Sheets API returned: ' + err);
                                    return;
                                  }
                                  process.stdout.write(' OK\n\n');
                                });
                              });
                            }
                          }
                        });
                      } else {
                        console.log('Error: Numarul de studenti nu corespunde cu numarul de note\n');
                        return;
                      }
                    } else {
                      console.log('Error: Rangeul pentru note inexistent sau fara date\n');
                      return;
                    }
                  } else {
                    console.log('Error: Rangeul pentru nume inexistent sau fara date\n');
                    return;
                  }
                });
                rl.close();
              });
            });
          });
        });
      });
    });
  });
}
