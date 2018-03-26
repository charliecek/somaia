window.onerror = function () {
  for (var i = 0; i < arguments.length; i++) {
    console.warn(arguments[i]);
  }
}
// auxiliary variables and functions //
var tabs = ["tab1", "tab2", "tab3", "tab4"];
for (var tabKey in tabs) {
  window[tabs[tabKey]] = {};
}
var debug = false;
var labelTimeout = 3000;
tab1.doIterate = false;
tab1.resetJustDone = false;
tab1.somIteration = 1;
tab1.sat_somPtGrid = {};
tab1.sat_inPtGrid = {};
tab1.sat_somPtGridHistory = [];
tab1.showHistoryIteration = false;
tab1.learningFinished = false;
tab1.learningJustFinished = false;
tab1.initFromHistory = false;
tab1.changeRateHistory = [];
tab1.bmuHistory = [];
tab1.hitMapHistory = [];
// SOM - generated randomly on init //
tab1.somInitRange = [0,10];
tab2.somInitRange = [0,1];
tab3.somInitRange = [0,10];
tab4.somInitRange = [0,1];

tab1.defaultGridDistanceType = "euclid";
tab1.GridDistance = undefined;
// constants //
tab1.somH = 15,
tab1.somW = tab1.somH, // square grid for simplicity
tab3.somH = 10,
tab3.somW = 10,
tab4.somH = 8,
tab4.somW = 8,
tab1.maxIterations = 1000,
tab1.LearningRate_0 = 0.2, // alpha is also used - the learning rate at the beginning
tab1.changeRateThreshold = 7;

tab1.inputMatrix = undefined, tab1.inputVectorCount = undefined, tab1.inputVectorLength = undefined;
tab1.defaultThetaType = "gaussianDecay";
tab1.defaultInputSelectionType = "1"; // random
tab1.defaultNeighbourhoodRadiusType = "expDecay";
tab1.defaultLearningRateType = "expDecay";

function sleepFor(sleepDuration) {
  var now = new Date().getTime();
  while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
}
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};

window.fileListName = "file_list4";
window.saveCompressed = false;
window.saveOnServer = false;
window.saveToLocalStorage = false;
window.SOMAIA_HISTORY = {};
function readFile(filename, compress = false) {
  console.info("reading file: "+filename)
  var url = "http://somaia.charliecek.eu/"+filename+".txt";
  var res = "";
  $.ajax({
    url: url,
    success: function (result) {
      if (result.status === 200) {
        res = result.responseText;
      } else {
        console.warn("result seems to be the content already; treating it so")
        res = result;
      }
    },
    async: false
  });
  if (res.length > 0) {
    if (compress) {
      res = LZString.decompressFromUTF16(res);
    }
    var json;
    try {
      json = JSON.parse(res);
    } catch (e) {
      console.warn(e)
      return "";
    }
    console.info("json parsed correctly for "+filename);
    console.log(typeof json);
    res = json;
  } else {
    console.warn("empty read result is returned");
  }
  return res;
}
function getListing() {
  var res;
  $.ajax({
    url: '../fs.php',
    data : {action: "dirlisting"},
    type: 'POST',
    async: false,
    success: function (result) {
      if (result.status === 200) {
        res = result.responseText;
      } else {
        console.warn("result seems to be the content already; treating it so")
        res = result;
      }
    }
  });
  try {
    json = JSON.parse(res);
  } catch (e) {
    console.warn(e)
    return [];
  }
  return json;
}
function saveFile(data, filename, compress = false) {
  console.info("saving file: "+filename);
  jsonString = JSON.stringify(data)
  if (compress) {
    jsonString = LZString.compressToUTF16(jsonString);
  }
  $.ajax({
    url: '../fs.php',
    data : {json_string: jsonString, file_name: filename, action: "save"},
    type: 'POST',
    async: false
  });
  console.log("file " +filename+ " has been saved");
}
function saveHistoryToFile(somaia_history, compress = false) {
  var tabs = Object.keys(somaia_history);
  var fileList = readFile(window.fileListName, compress);
  if ("object" !== typeof fileList) {
    fileList = {};
  }
  var saving = {};
  for (var tabKey in tabs) {
    var tabID = tabs[tabKey];
    var somaia_history_keys = Object.keys(somaia_history[tabID]);
    for (var key in somaia_history_keys) {
      var somHistoryID = somaia_history_keys[key];
      var filename = tabID + "_" + somHistoryID;
      var somHistory = somaia_history[tabID][somHistoryID];
      var somHistoryStr = JSON.stringify(somHistory);
      var somHistoryStrHash = CryptoJS.MD5(somHistoryStr).toString();
      if ("undefined" === fileList[filename] || fileList[filename] !== somHistoryStrHash) {
        // save //
        console.info("hashes don't match for: " + filename);
        saving[filename] = somHistoryStrHash;
        saveFile(somHistory, filename, compress);
      } else {
        // ok, it's there already //
        console.info("hashes match, not saving file: " + filename);
      }
    }
  }
  if (Object.size(saving) > 0) {
    for (var key in saving) {
      fileList[key] = saving[key];
    }
    saveFile(fileList, window.fileListName, compress);
  }
}
function readWholeHistoryFromFile(compress = false) {
  var fileList = readFile(window.fileListName, compress);
  if ("object" !== typeof fileList) {
    console.warn("fileList is corrupt, not getting any files");
    console.log(fileList)
    console.log(typeof fileList)
    return {};
  }
  console.info("fileList contains "+Object.size(fileList)+" files");
  var output = {};
  for (var filename in fileList) {
    console.info("getting file: "+filename)
    var spl = filename.split("_");
    var tabID = spl[0], somHistoryID = spl[1];
    if ("undefined" === typeof output[tabID]) {
      output[tabID] = {};
    }
    var readRes = readFile(filename, compress);
    if ("object" === typeof readRes && null !== readRes) {
      output[tabID][somHistoryID] = readRes;
      console.info("object received for "+tabID+"["+somHistoryID+"]");
    } else {
      console.warn("read result for " +tabID+"["+somHistoryID+"] is not an object");
      console.log(typeof readRes)
    }
  }
  return output;
}
function readSingleHistoryFromFile(tabID, somHistoryID, compress = false) {
  var fileList = readFile(window.fileListName, compress);
  if ("object" !== typeof fileList) {
    return undefined;
  }
  var filename = tabID + "_" + somHistoryID;
  if ("undefined" === fileList[filename]) {
    return undefined;
  }
  var content = readFile(filename, compress);
  if ("string" === typeof content) {
    return undefined;
  }
  return content;
}
function cloneGlobalsFromTab(fromTab = "tab1") {
  if ("undefined" === typeof debug) {
    debugLoc = false;
  } else {
    debugLoc = debug;
  }
  for (var fromTabKey in window[fromTab]) {
    for (var tabKey in tabs) {
      tabID = tabs[tabKey]
      if (tabID === fromTab) {
        continue;
      }
      if (window[fromTab].hasOwnProperty(fromTabKey)) {
        if ("undefined" === typeof window[tabID]) {
          window[tabID] = {};
          console.info("window["+tabID+"] is undefined, creating it as an empty object");
        }
        if ("undefined" !== typeof window[tabID][fromTabKey]) {
          debugLoc && console.info("defined already:", fromTabKey, window[tabID][fromTabKey]);
        } else if ("object" === typeof window[fromTab][fromTabKey]) {
          if (window[fromTab][fromTabKey] instanceof Array) {
            if (window[fromTab][fromTabKey].length === 0) {
              window[tabID][fromTabKey] = [];
              debugLoc && console.info("creating empty array " + tabID + "." + fromTabKey);
            } else {
              debugLoc && console.warn(fromTabKey + " is an undefined array on tab " + tabID);
            }
          } else {
            if (Object.size(window[fromTab][fromTabKey]) === 0) {
              window[tabID][fromTabKey] = {};
              debugLoc && console.info("creating empty object " + tabID + "." + fromTabKey);
            } else {
              debugLoc && console.warn(fromTabKey + " is an undefined object on tab " + tabID);
            }
          }
        } else {
          debugLoc && console.info("copying " + tabID + "." + fromTabKey + " from " + fromTab + "." + fromTabKey);
          window[tabID][fromTabKey] = window[fromTab][fromTabKey];
        }
      }
    }
  }
  debugLoc && console.info("FINISHED cloning from " + fromTab)
}
function cloneArray(arr) {
  return JSON.parse(JSON.stringify(arr));
}
function showNodesWithinGridDistanceClear(tab = "tab2") {
  if ("undefined" === typeof window[tab].emPts || window[tab].emPts.length === 0) {
    window[tab].emPts = [];
  } else {
    for (var l = 0; l < window[tab].emPts.length; l++) {
      window[tab].emPts[l].remove();
    }
  }
}
function showNodesWithinGridDistance(gridX, gridY, gridDistanceVal, tab = "tab2", scol="black", sw = 3) {
  showNodesWithinGridDistanceClear(tab);
  
  if ($(".showBmuAndNeighbourhoodCheckbox[data-tab="+tab+"]:checked").length < 1) {
    return;
  }
  
  var k = 0;
  for (var i = 0; i < window[tab].somW; i++) {
    for (var j = 0; j < window[tab].somH; j++) {
      if (i === gridX && j === gridY) {
        continue
      }
      var dist = window[tab].GridDistance([gridX,gridY], [i,j]);
      if (tab === "tab3" || tab === "tab4") {
        for (var ind = 0; ind < window[tab].som[0][0].length; ind++) {
          var ptCurrent = window[tab].sat_somPtGrid[i][j][ind]; // path object
          
          if (dist <= gridDistanceVal) {
            window[tab].emPts[k] = ptCurrent.clone();
            window[tab].emPts[k].strokeWidth = sw;
            window[tab].emPts[k].fillColor = null;
            window[tab].emPts[k].strokeColor = scol;
            k++;
          }
        }
      } else {
        var ptCurrent = window[tab].sat_somPtGrid[i][j];
        
        if (dist <= gridDistanceVal) {
          window[tab].emPts[k] = ptCurrent.clone();
          window[tab].emPts[k].strokeWidth = sw;
          window[tab].emPts[k].fillColor = null;
          window[tab].emPts[k].strokeColor = scol;
          k++;
        }
      }
    }
  }
  if (tab === "tab3" || tab === "tab4") {
    for (var ind = 0; ind < window[tab].som[0][0].length; ind++) {
      var ptBmu = window[tab].sat_somPtGrid[gridX][gridY][ind];
      window[tab].emPts[k] = ptBmu.clone();
      window[tab].emPts[k].strokeWidth = sw*3;
      window[tab].emPts[k].fillColor = null;
      window[tab].emPts[k].strokeColor = scol;
      window[tab].somTraining.activeLayer.insertChild(
        window[tab].somTraining.activeLayer.children.length,
        window[tab].emPts[k]
      );
      k++;
    }
  } else {
    var ptBmu = window[tab].sat_somPtGrid[gridX][gridY];
    window[tab].emPts[k] = ptBmu.clone();
    window[tab].emPts[k].strokeWidth = sw*3;
    window[tab].emPts[k].fillColor = null;
    window[tab].emPts[k].strokeColor = scol;
    window[tab].somTraining.activeLayer.insertChild(
      window[tab].somTraining.activeLayer.children.length,
      window[tab].emPts[k]
    );
  }
}
function showClickedNodeClear(tab = "tab1") {
  if ("undefined" === typeof window[tab].clickedPts || window[tab].clickedPts.length === 0) {
    window[tab].clickedPts = [];
  } else {
    for (var l = 0; l < window[tab].clickedPts.length; l++) {
      window[tab].clickedPts[l].remove();
    }
  }
}
function showClickedNode(gridX, gridY, tab = "tab1", scol="black", sw = 3, timeout = 3000) {
  showClickedNodeClear(tab);
  if ("undefined" === window[tab].clickedNodeTimeoutHandle) {
    window[tab].clickedNodeTimeoutHandle = false;
  }
  if (window[tab].clickedNodeTimeoutHandle !== false) {
    clearTimeout(window[tab].clickedNodeTimeoutHandle);
    window[tab].clickedNodeTimeoutHandle = false;
  }

  k = 0;
  if (tab === "tab3" || tab === "tab4") {
    for (var ind = 0; ind < window[tab].som[0][0].length; ind++) {
      var ptBmu = window[tab].sat_somPtGrid[gridX][gridY][ind];
      window[tab].clickedPts[k] = ptBmu.clone();
      window[tab].clickedPts[k].strokeWidth = sw*3;
      window[tab].clickedPts[k].fillColor = null;
      window[tab].clickedPts[k].strokeColor = scol;
      window[tab].somTraining.activeLayer.insertChild(
        window[tab].somTraining.activeLayer.children.length,
        window[tab].clickedPts[k]
      );
      k++;
    }
  } else {
    var ptBmu = window[tab].sat_somPtGrid[gridX][gridY];
    window[tab].clickedPts[k] = ptBmu.clone();
    window[tab].clickedPts[k].strokeWidth = sw*3;
    window[tab].clickedPts[k].fillColor = null;
    window[tab].clickedPts[k].strokeColor = scol;
    window[tab].somTraining.activeLayer.insertChild(
      window[tab].somTraining.activeLayer.children.length,
      window[tab].clickedPts[k]
    );
  }
  window[tab].clickedNodeTimeoutHandle = setTimeout(function() {
    showClickedNodeClear(tab);
  }, timeout);
}
function gradientColor(percentFade) {
  var startColor = { // white
    red: 1,
    green: 1,
    blue: 1
  };
//   var startColor = { // black
//     red: 0,
//     green: 0,
//     blue: 0
//   };
  var endColor = {
    red: 1,
    green: 0,
    blue: 0
  };
  var diffRed = endColor.red - startColor.red;
  var diffGreen = endColor.green - startColor.green;
  var diffBlue = endColor.blue - startColor.blue;

  diffRed = (diffRed * percentFade) + startColor.red;
  diffGreen = (diffGreen * percentFade) + startColor.green;
  diffBlue = (diffBlue * percentFade) + startColor.blue;
  
  var res = {
    red: diffRed,
    green: diffGreen,
    blue: diffBlue
  };
  return res;
}
function scaleElem(elem,paper,scaling){
    // store current position
    var prevPos = new paper.Point(elem.bounds.x,elem.bounds.y);

    // apply scaling
    elem.scale(scaling,scaling);

    // reposition the elem to previous pos(scaling moves the elem so we reset it's position);
    var newPos = prevPos + new paper.Point(elem.bounds.width/2,elem.bounds.height/2);
    elem.position = newPos;
}
function WeightDistance(point1, point2) { // square of Euclidean distance //
  var deltaVector = math.subtract(point1, point2);
  return math.sum(math.square(deltaVector));
}
function setGridDistance(normType, tab = "tab1") {
  switch (normType) {
    case "euclid":
      var F_distance = math.distance;
      break;
    case "euclid_square":
      var F_distance = function(point1, point2) {
        var vector = math.subtract(point1, point2);
        return math.sum(math.square(vector));
      }
      break;
    case "taxicab":
    case "rhombus_neighbourhood":
      var F_distance = function(point1, point2) {
        var vector = math.subtract(point1, point2);
        return math.norm(vector, 1);
      }
      break;
    case "min":
      var F_distance = function(point1, point2) {
        var vector = math.subtract(point1, point2);
        return math.norm(vector, -Infinity);
      }
      break;
    case "max":
    case "square_neighbourhood":
    case "chebyshev":
      var F_distance = function(point1, point2) {
        var vector = math.subtract(point1, point2);
        return math.norm(vector, Infinity);
      }
      break;
    case "hexagonal_neighbourhood_2d": // only for 2D
      var F_distance = function(point1, point2) {
        if (point1.length !== 2) {
          console.error("Hex neighbourhood is for 2D only!");
          setGridDistance(defaultGridDistanceType, tab);
          return;
        }
        var x1 = point1[0], y1 = point1[1], x2 = point2[0], y2 = point2[1];
        // Transform the coordinates to form a hexagonal grid and then just use euclidean distance //
        x1 += (y1 % 2) * 0.5;
        x2 += (y2 % 2) * 0.5;
        y1 *= math.sqrt(3)/2;
        y2 *= math.sqrt(3)/2;
        return math.round(math.distance([x1,y1], [x2,y2]), 4);
      }
      break;
  }
  window[tab].GridDistance = F_distance;
  window[tab].GridDistanceType = normType;
}
setGridDistance(tab1.defaultGridDistanceType);
tab1.mapRadius = tab1.GridDistance([0,0],[tab1.somW,tab1.somH])/2; // grid radius

tab1.defaultInputShapeType = "kruznica_nerovnomerne";
function generujZhluky(pocetZhlukov) {
  var b = [];
  var i = 0;
  for (var c = 0; c < pocetZhlukov; c++) {
    var stredX = math.random(0, 10),
        stredY = math.random(0, 10),
        r = math.random(0.1, 1),
        pocet = math.random(5, 10);
    for (var j = 0; j < pocet; j++) {
      var x = math.max(0, math.random(stredX - r, stredX + r));
      var y = math.max(0, math.random(stredY - r, stredY + r));
      b[i] = [x, y];
      i++;
    }
  }
  return b;
}
function setInputShape(inputShape) { // only for tab1
  switch (inputShape) {
    case "kruznica_rovnomerne":
      var R = 3, stredX = 4, stredY = 4, pocet = 20;
      var body = [];
      for (var i = 0; i < pocet; i++) {
        body[i] = [stredX+R*math.cos(i*2*math.pi/pocet), stredY+R*math.sin(i*2*math.pi/pocet)];
      }
      break;
    case "kruznica_nerovnomerne":
      var R = 3, stredX = 4, stredY = 4, pocet = 20;
      var body = [];
      for (var i = 0; i < pocet; i++) {
        var j = math.random(0, pocet);
        body[i] = [stredX+R*math.cos(j*2*math.pi/pocet), stredY+R*math.sin(j*2*math.pi/pocet)];
      }
      break;
    case "kruh_nerovnomerne":
      var R = 3, stredX = 4, stredY = 4, pocet = 100;
      var body = [];
      for (var i = 0; i < pocet; i++) {
        var j = math.random(0, pocet);
        var r = math.random(0, R);
        body[i] = [stredX+r*math.cos(j*2*math.pi/pocet), stredY+r*math.sin(j*2*math.pi/pocet)];
      }
      break;
    case "stvorec":
      var minX = 1, minY = 1, maxX = 7, maxY = 7, pocet = 100;
      var body = [];
      for (var i = 0; i < pocet; i++) {
        var x = math.random(minX, maxX);
        var y = math.random(minY, maxY);
        body[i] = [x, y];
      }
      break;
    case "mriezka":
      var body = [];
      var i = 0;
      for (var y = 1; y < 7; y++) {
        for (var x = 1; x < 7; x++) {
          body[i] = [x, y];
          i++;
        }
      }
      break
    case "2zhluky":
      body = generujZhluky(2);
      break;
    case "3zhluky":
      body = generujZhluky(3);
      break;
    case "4zhluky":
      body = generujZhluky(4);
      break;
    case "random_pts":
      var body = [];
      var somArr = cloneArray(tab1.somOrig);
      var k = 0;
      for (var i = 0; i < tab1.somW; i++) {
        for (var j = 0; j < tab1.somH; j++) {
          body[k] = somArr[i][j];
          k++;
        }
      }
      break;
    default:
      var body = [
        [1,2],
        [1.1,1.9],
        [0.9,2.1],
        [0.8,2.1],
        [0.99,2.2],
        [7.9,8],
        [8,8.1],
        [8.2,7.99],
        [7.8,8.19],
        [10,3]
      ];
  }
  tab1.inputMatrix = cloneArray(body);
  tab1.inputVectorCount = tab1.inputMatrix.length;
  tab1.inputVectorLength = tab1.inputMatrix[0].length;
  tab1.inputShapeType = inputShape;
}
setInputShape(tab1.defaultInputShapeType);// only for tab1

tab2.defaultInputColors = [
  [1,0,0],
  [0,1,0],
  [0,0,1]
];
tab2.defaultInputLabels = [
  "Červená",
  "Zelená",
  "Modrá"
]
function setInputColors(inputColors) { // only for tab2
  tab2.inputMatrix = cloneArray(inputColors);
  tab2.inputLabels = [];
  tab2.inputLabelColors = {
    _names: []
  };
  for (var i = 0; i < inputColors.length; i++) {
    var label = undefined;
    var inputColor = inputColors[i];
    for (var d = 0; d < tab2.defaultInputColors.length; d++) {
      if (JSON.stringify(tab2.defaultInputColors[d]) === JSON.stringify(inputColor)) {
        label = tab2.defaultInputLabels[d];
        break;
      }
    }
    if ("undefined" === typeof label) {
      label = $("#const_InputColors_tab2 option[value='" + JSON.stringify(inputColor) + "']").data("label");
    }
    if ("undefined" === typeof label || "" === label) {
      label = JSON.stringify(inputColor)
    }
    tab2.inputLabels[i] = label;
    tab2.inputLabelColors[label] = inputColor;
    tab2.inputLabelColors._names.push(label);
  }
  tab2.InputColors = inputColors;
  tab2.inputVectorCount = tab2.inputMatrix.length;
  tab2.inputVectorLength = tab2.inputMatrix[0].length;
  setHitMapTemplate("tab2");
}
setInputColors(tab2.defaultInputColors); // only for tab2

function setInputDataIris() { // only for tab3
  tab3.inputMatrix = cloneArray(iris_data.data);
  tab3.inputLabels = iris_data.row_labels;
  tab3.inputColumnLabels = iris_data.column_labels;
  tab3.inputLabelColors = iris_data.row_colors;
  tab3.inputVectorCount = tab3.inputMatrix.length;
  tab3.inputVectorLength = tab3.inputMatrix[0].length;
}
setInputDataIris();

function setInputDataPop() { // only for tab4
  tab4.inputMatrix = math.multiply(population_indicators.data, 0.01);
  tab4.inputLabels = cloneArray(population_indicators.row_labels);
  tab4.inputColumnLabels = cloneArray(population_indicators.column_labels);
  tab4.inputLabelColors = cloneArray(population_indicators.row_colors);
  tab4.inputVectorCount = tab4.inputMatrix.length;
  tab4.inputVectorLength = tab4.inputMatrix[0].length;
}
setInputDataPop();

cloneGlobalsFromTab("tab1");

function initSOM(tab = "tab1") {
  if ("undefined" === typeof window[tab].somInitRange) {
    console.warn("Tab "+tab+" has no somInitRange; setting to default: [0,1].");
    window[tab].somInitRange = [0,1];
  }
  window[tab].som = math.random(
    [window[tab].somW, window[tab].somH, window[tab].inputVectorLength],
    window[tab].somInitRange[0],
    window[tab].somInitRange[1]
  );
  setGridDistance(window[tab].GridDistanceType, tab);
  window[tab].mapRadius = window[tab].GridDistance([0,0],[window[tab].somW-1,window[tab].somH-1])/2;
  if ("undefined" === typeof window[tab].NeighbourhoodRadiusType) {
    setNeighbourhoodRadius(window[tab].defaultNeighbourhoodRadiusType, tab);
  } else {
    setNeighbourhoodRadius(window[tab].NeighbourhoodRadiusType, tab);
  }
  window[tab].somOrig = cloneArray(window[tab].som);
  setHitMapTemplate(tab);
}
for (var tabKey in tabs) {
  tabID = tabs[tabKey]

  initSOM(tabID);
}

// the algorithm's main function - the weight adjustment function //
var LearningFunction = function(iteration, inputVector, currentNodeVector, nodeToBmuGridDistance,
                                Theta = tab1.Theta, LearningRate = tab1.LearningRate) { // for BOTH tabs
  // w(t+1) = Theta * LearningRate * (inputVector - w(t)) // w(t) = currentNodeVector at iteration t //
  var delta = math.subtract(inputVector, currentNodeVector);
  var weightedDelta = math.multiply(delta, math.multiply( Theta(nodeToBmuGridDistance, iteration), LearningRate(iteration)));
  return math.add(currentNodeVector, weightedDelta);
}

// functions used by the algorithm //
// Theta represents the amount of influence a node's distance from the BMU has on its learning //
function setTheta(thetaType, tab = "tab1") {
  switch (thetaType) {
    case "gaussianDecay":
      var F_theta = function(nodeToBmuGridDistance, iteration) {
        var exponent = - math.square(nodeToBmuGridDistance) / ( 2 * math.square(window[tab].NeighbourhoodRadius(iteration)) );
        return math.exp(exponent);
      }
      break;
    case "gaussianDecayWithRepulsion":
      var F_theta = function(nodeToBmuGridDistance, iteration) {
        var a = 2;
        var b = 2 / math.sqrt(3) * math.pow(math.pi,-0.25);
        var exponent = - math.square(nodeToBmuGridDistance) / ( a * math.square(window[tab].NeighbourhoodRadius(iteration)) );
        return (b * (1 - (math.exp(exponent) / (2 * math.square(window[tab].NeighbourhoodRadius(iteration))) )));
      }
      break;
    case "uniform":
      var F_theta = function(nodeToBmuGridDistance, iteration) {
        return (1 - nodeToBmuGridDistance / window[tab].NeighbourhoodRadius(iteration));
      }
      break;
    case "uniformWithRepulsion":
      var F_theta = function(nodeToBmuGridDistance, iteration) {
        var factor = 1.1;
        return (1 - factor * nodeToBmuGridDistance / window[tab].NeighbourhoodRadius(iteration));
      }
      break;
  }
  window[tab].Theta = F_theta;
  window[tab].ThetaType = thetaType;
}
setTheta(tab1.defaultThetaType);

function setInputSelectionType(inputSelectionType, tab = "tab1") {
  window[tab].systematicInputSelection = (inputSelectionType === "0");
  window[tab].InputSelectionType = inputSelectionType;
}
setInputSelectionType(tab1.defaultInputSelectionType);

// neighbourhood radius at iteration //
function setNeighbourhoodRadius(neighbourhoodRadiusType, tab = "tab1") {
  switch (neighbourhoodRadiusType) {
    case "expDecay":
      var F_neighbourhoodRadius = function(iteration) {
        var lambda = window[tab].maxIterations / window[tab].mapRadius;
        return window[tab].mapRadius * math.exp(-iteration/lambda);
        // return math.pow(window[tab].mapRadius,(1 - iteration / window[tab].maxIterations));
      }
      break;
    case "uniform":
      var F_neighbourhoodRadius = function(iteration) {
        return (1-window[tab].mapRadius) / window[tab].maxIterations * iteration + window[tab].mapRadius;
      }
      break;
  }
  window[tab].NeighbourhoodRadius = F_neighbourhoodRadius;
  window[tab].NeighbourhoodRadiusType = neighbourhoodRadiusType;
}
setNeighbourhoodRadius(tab1.defaultNeighbourhoodRadiusType);

// Learning rate function //
function setLearningRate(learningRateType, tab = "tab1") {
  switch (learningRateType) {
    case "expDecay":
      var F_learningRate = function(iteration) {
        var lambda = window[tab].maxIterations / window[tab].mapRadius;
        return window[tab].LearningRate_0 * math.exp(-iteration/lambda);
        // return window[tab].LearningRate_0 * math.pow(window[tab].mapRadius,(-iteration / window[tab].maxIterations));
      }
      break;
    case "uniform":
      var F_learningRate = function(iteration) {
        return window[tab].LearningRate_0 + (iteration * (1 - (window[tab].maxIterations * window[tab].LearningRate_0)) / math.square(window[tab].maxIterations));
      }
      break
  }
  window[tab].LearningRate = F_learningRate;
  window[tab].LearningRateType = learningRateType;
}
setLearningRate(tab1.defaultLearningRateType);

function isChangeUnnoticeable(tab = "tab1") {
  var arr = window[tab].changeRateHistory
  if (arr.length === 0) {
    return false;
  }
  var slicedArr = arr.slice(Math.max(arr.length - 10, 0));
  if (slicedArr.length === 0) {
    return false;
  }
  var changeRateMax = math.max(slicedArr);
  var changeRateThreshold = window[tab].changeRateThreshold;
  return false !== changeRateThreshold && changeRateMax < math.pow(10,-changeRateThreshold);
}
function getBmusToInputsAvg(tab = "tab1") {
  var dist = 0;

  for (var k = 0; k < window[tab].inputVectorCount; k++) {
    var inputVector = math.squeeze(window[tab].inputMatrix.subset(math.index(k, [0,1])));
    var winnerCoordinates = {};
    for (var i = 0; i < somW; i++) {
      for (var j = 0; j < somH; j++) {
        var nodeWeightVector = math.squeeze(window[tab].som.subset(math.index(i,j,[0,1])));
        
        var distance = window[tab].WeightDistance(inputVector, nodeWeightVector); // weight distance - used only for comparison
        
        if (undefined === winnerCoordinates.distance || distance < winnerCoordinates.distance) {
          winnerCoordinates = {
            i: i,
            j: j,
            distance: distance
          }
        }
      }
    }
    dist += winnerCoordinates.distance;
  }
  distAvg = dist / window[tab].inputVectorCount;
  return distAvg;
}
function setHitMapTemplate(tab) {
  if ("undefined" === typeof window[tab] || "undefined" === typeof window[tab].somW) {
    return;
  }
  var hitMap = {
    counts: math.zeros(window[tab].somW, window[tab].somH).toArray(),
    labelCounts: {}
  };
  if ("undefined" !== typeof window[tab].inputLabels) {
    for (var il = 0; il < window[tab].inputLabels.length; il++) {
      hitMap.labelCounts[window[tab].inputLabels[il]] = math.zeros(window[tab].somW, window[tab].somH).toArray();
    }
  }
  window[tab].hitMapTemplate = hitMap;
}
function saveHitMapHistory(iteration, tab = "tab1") {
  var inputArr = cloneArray(window[tab].inputMatrix);
  var somArr = cloneArray(window[tab].som);
  var hitMap = JSON.parse(JSON.stringify(window[tab].hitMapTemplate));
  for (var ii = 0; ii < window[tab].inputVectorCount; ii++) {
    var winnerCoordinates = {};
    var inputVector = inputArr[ii];
    for (var i = 0; i < window[tab].somW; i++) {
      for (var j = 0; j < window[tab].somH; j++) {
        var nodeWeightVector = somArr[i][j];
        
        var distance = WeightDistance(inputVector, nodeWeightVector); // weight distance - used only for comparison
      
        if (undefined === winnerCoordinates.distance || distance < winnerCoordinates.distance) {
          winnerCoordinates = {
            i: i,
            j: j,
            distance: distance
          }
        }

      }
    }
    hitMap.counts[winnerCoordinates.i][winnerCoordinates.j]++;
    if ("undefined" !== typeof window[tab].inputLabels && "undefined" !== typeof window[tab].inputLabels[ii]) {
      var labelName = window[tab].inputLabels[ii];
      hitMap.labelCounts[labelName][winnerCoordinates.i][winnerCoordinates.j]++
    }
  }
  window[tab].hitMapHistory[iteration] = hitMap;
}

// The whole som learning algorithm //
function SomAlgorithm(iterationEndCall, tab = "tab1") {
  // iterate algorithm until maxIterations is achieved or stopping conditions are met //
  for (var iteration = 1; iteration <= window[tab].maxIterations; iteration++) { // iterations are positive integers //
    SomAlgorithmIterationStep(iteration, iterationEndCall);
  }
}
// One iteration of som learning algorithm //
function SomAlgorithmIterationStep(iteration, iterationEndCall, tab = "tab1") {
  var winnerCoordinates = {};
  var changeRate = 0;
  var neighbourhoodRadiusPrecise = window[tab].NeighbourhoodRadius(iteration);
  var neighbourhoodRadius = math.round(neighbourhoodRadiusPrecise);
//       console.log(neighbourhoodRadius);
  var inputArr = window[tab].inputMatrix;
  var somArr = window[tab].som;
//   var indArr = [];
//   switch (tab) {
//     case "tab1":
//       indArr = [0,1];
//       break;
//     case "tab2":
//       indArr = [0,1,2];
//       break;
//     case "tab3":
//       indArr = [0,1,2,3];
//       break;
//     case "tab4":
//       indArr = [0,1,2,3,4,5];
//       break;
//   }

  if (window[tab].systematicInputSelection) {
    var inputN = (iteration - 1) % window[tab].inputVectorCount; // go through input vectors systematically //
  } else {
    var inputN = math.randomInt(0, window[tab].inputVectorCount); // pick at random //
  }
  //var inputVector = math.squeeze(window[tab].inputMatrix.subset(math.index(inputN, indArr)));
  var inputVector = inputArr[inputN];
  
  // loop through SOM network nodes //
  for (var i = 0; i < window[tab].somW; i++) {
    for (var j = 0; j < window[tab].somH; j++) {
      //var nodeWeightVector = math.squeeze(window[tab].som.subset(math.index(i,j, indArr)));
      var nodeWeightVector = somArr[i][j];
      
      var distance = WeightDistance(inputVector, nodeWeightVector); // weight distance - used only for comparison
      
      if (undefined === winnerCoordinates.distance || distance < winnerCoordinates.distance) {
        winnerCoordinates = {
          i: i,
          j: j,
          distance: distance
        }
      }
    }
  }
  
  // adjust weights of the whole network according to the winner //
  //var winnerVector = math.squeeze(window[tab].som.subset(math.index(winnerCoordinates.i,winnerCoordinates.j,indArr)));
  var winnerVector = somArr[winnerCoordinates.i][winnerCoordinates.j];
  
  // show the winner vector and its neighbourhood //
  //showNodesWithinGridDistance(winnerCoordinates.i, winnerCoordinates.j, neighbourhoodRadius, tab);
  
  for (var i = 0; i < window[tab].somW; i++) {
    for (var j = 0; j < window[tab].somH; j++) {
      //var currentNodeVector = math.squeeze(window[tab].som.subset(math.index(i,j,indArr)));
      var currentNodeVector = somArr[i][j]
      
      var currentNodeToBmuGridDistance = window[tab].GridDistance([winnerCoordinates.i,winnerCoordinates.j], [i,j]); // grid distance - used for neighbourhood evaluation!
      if (currentNodeToBmuGridDistance <= neighbourhoodRadius) {
        var newVector = LearningFunction(iteration, inputVector, currentNodeVector, currentNodeToBmuGridDistance, window[tab].Theta, window[tab].LearningRate);
        changeRate += WeightDistance(currentNodeVector,newVector)
        // replace the old vector at positions [i,j] with the new one //
        // window[tab].som.subset(math.index(i,j,indArr), newVector);
        window[tab].som[i][j] = newVector;
      }
    }
  }
  window[tab].changeRateHistory[iteration] = changeRate;
  window[tab].bmuHistory[iteration] = {
    i: winnerCoordinates.i,
    j: winnerCoordinates.j,
    neighbourhoodRadius: neighbourhoodRadius,
    neighbourhoodRadiusPrecise: neighbourhoodRadiusPrecise
  };
  saveHitMapHistory(iteration, tab);
  
  if (isChangeUnnoticeable(tab)) {
    window[tab].learningJustFinished = true;
  }
  if ("undefined" !== typeof iterationEndCall) {
    iterationEndCall(iteration);
  }
}

// tab2 specific - input color squares //
function setColorSquareColor(item) {
  var colorSquare = $(item);
  var rgbVal = colorSquare.data("value");
  if ("object" === typeof rgbVal && rgbVal instanceof Array) {
    var rgbColorString = math.multiply(rgbVal, 255).toString();
    colorSquare.css("color", "rgb("+rgbColorString+")");
    if (rgbColorString === '255,255,255') {
      colorSquare.css("background-color", "grey");
    }
  }
}

// drawing part //
function getCanvasSize(tab = "tab1", args = {}) {
  if ("undefined" === typeof args.sizeX) {
    args.sizeX = 500;
  }
  if ("undefined" === typeof args.sizeY) {
    args.sizeY = 500;
  }
  if ("undefined" === typeof args.radius) {
    args.radius = 10;
  }
  if ("undefined" === typeof args.sideLength) {
    args.sideLength = 5;
  }
  var inMax = math.max(window[tab].inputMatrix, 0);
  var somMax = math.max(math.max(window[tab].som,0),0);
  max = math.max([inMax, somMax]);
  size = {
    scaleX: args.sizeX / max,
    scaleY: args.sizeY / max,
    sizeX: args.sizeX,
    sizeY: args.sizeY,
    radius: args.radius,
    sideLength: args.sideLength
  };
  debug && console.log(tab, size);
  return size;
}

// click and change event callback functions //
function resetSom(tab = "tab1") {
  window[tab].doIterate = true;
  window[tab].resetJustDone = true;
  window[tab].somIteration = 1;
  if ("undefined" !== typeof window[tab].changeRatePaper.clear) {
    window[tab].changeRatePaper.clear();
  }
  if ("undefined" !== typeof window[tab].neighbourhoodRadiusPaper.clear) {
    window[tab].neighbourhoodRadiusPaper.clear();
  }
  window[tab].learningFinished = false;
  window[tab].learningJustFinished = false;
  window[tab].changeRateHistory = [];
  window[tab].bmuHistory = [];
  window[tab].hitMapHistory = [];
  window[tab].som = cloneArray(window[tab].somOrig);
  if ("undefined" !== typeof window[tab].hitMapPaper.init) {
    window[tab].hitMapPaper.init();
  }
  if ("undefined" !== typeof window[tab].hitMapPaper.clear) {
    window[tab].hitMapPaper.clear();
  }
  showNodesWithinGridDistanceClear(tab);
  var selectorPart = "";
  if (tab !== "tab1") {
    selectorPart = "_" + tab;
  }
  $("#resetSomButton"+selectorPart).attr("disabled", "disabled");
  $("#trainStopSomButton"+selectorPart).attr("disabled", "disabled");
  $("#trainSomButton"+selectorPart).removeAttr('disabled');
  $("#trainSomButton"+selectorPart+">i").removeClass("fa-pause").addClass("fa-play");
  $("#counter"+selectorPart+" span").html("0");
  $("#sat_historySliderInput"+selectorPart).slider("disable");
  $("#sat_historySliderInput"+selectorPart)
        .slider('setAttribute', 'value', 0)
        .slider('setAttribute', 'max', 0)
        .slider('refresh');
  $("#"+tab+" .somConstants").slider("enable");
  $("#"+tab+" select[multiple=multiple]").multiselect("enable");
  $("#"+tab+" .inputSelectorWrapper select").removeAttr("disabled");
  $("#"+tab+" .historyImgContainer img").removeClass("disabled").removeClass("active");
}
function resetSomToAfterTraining(tab = "tab1") {
  var selectorPart = "";
  if (tab !== "tab1") {
    selectorPart = "_" + tab;
  }
  var maxIter = window[tab].somIteration-1;
  window[tab].somIteration++;
  window[tab].initFromHistory = true;
  window[tab].showHistoryIteration = false;
  $("#resetSomButton"+selectorPart).removeAttr("disabled");
  $("#trainStopSomButton"+selectorPart).attr("disabled", "disabled");
  $("#trainSomButton"+selectorPart).attr('disabled', "disabled");
  $("#trainSomButton"+selectorPart+">i").addClass("fa-pause").removeClass("fa-play");
  $("#counter"+selectorPart+" span").html(maxIter);
  $("#sat_historySliderInput"+selectorPart)
        .slider('setAttribute', 'value', maxIter)
        .slider('setAttribute', 'max', maxIter)
        .slider('refresh');
  $("#sat_historySliderInput"+selectorPart).slider("enable");
  $("#"+tab+" .somConstants").each(function (key, item) {
    var tab = $(item).closest(".tab-pane")[0].id;
    var selectorPart = "";
    if (tab !== "tab1") {
      selectorPart = "_" + tab;
    }
    var varName = item.id.replace("const_", "").replace(selectorPart, "");
    $(item).slider('setAttribute', 'value', window[tab][varName]).slider('refresh');
  }).slider("enable");
  $("#"+tab+" .inputSelectorWrapper select").each(function (key, item) {
    var selectID = item.id;
    var tab = $(item).closest(".tab-pane")[0].id;
    var selectorPart = "";
    if (tab !== "tab1") {
      selectorPart = "_" + tab;
    }
    var varName = item.id.replace("const_", "").replace(selectorPart, "");
    var val = window[tab][varName];
    if ("function" === typeof val) {
      varName += "Type";
      var val = window[tab][varName];
    }
    if ("string" === typeof val || "number" === typeof val) {
      $("#"+selectID).val(val);
    } else {
      // console.warn(varName, val, typeof val)
    }
  });
  setGridDistance(window[tab].GridDistanceType, tab);
  if ("undefined" !== typeof window[tab].hitMapPaper.init) {
    window[tab].hitMapPaper.init();
  }
  if ("undefined" !== typeof window[tab].hitMapPaper.clear) {
    window[tab].hitMapPaper.clear();
  }
  $("#"+tab+" .somConstants").slider("enable");
  $("#"+tab+" select[multiple=multiple]").multiselect("enable");
  $("#"+tab+" .inputSelectorWrapper select").removeAttr("disabled");
  $("#"+tab+" .historyImgContainer img").removeClass("disabled");
}

function trainSomEvent(evt, keyboard = false) {
  evt.preventDefault();
  if (keyboard === true) {
    var tab = $(".tab-pane.active")[0].id;
  } else {
    var tab = $(evt.target).closest(".tab-pane")[0].id;
  }
  var selectorPart = "";
  if (tab !== "tab1") {
    selectorPart = "_" + tab;
  }
  if (window[tab].learningFinished === true) {
    return;
  }
  window[tab].doIterate = !window[tab].doIterate;

  if (window[tab].doIterate) {
    $("#trainSomButton"+selectorPart+">i").addClass("fa-pause").removeClass("fa-play");
    $("#sat_historySliderInput"+selectorPart).slider("disable");
    $("#"+tab+" .somConstants").slider("disable");
    $("#"+tab+" select[multiple=multiple]").multiselect("disable");
    $("#"+tab+" .inputSelectorWrapper select").attr("disabled", "disabled");
    $("#"+tab+" .historyImgContainer img").addClass("disabled");
  } else {
    $("#trainSomButton"+selectorPart+">i").removeClass("fa-pause").addClass("fa-play");
    $("#sat_historySliderInput"+selectorPart).slider("enable");
    $("#"+tab+" .somConstants").slider("enable");
    $("#"+tab+" select[multiple=multiple]").multiselect("enable");
    $("#"+tab+" .inputSelectorWrapper select").removeAttr("disabled");
    $("#"+tab+" .historyImgContainer img").removeClass("disabled");
  }
}
function resetSomEvent(evt, keyboard = false) {
  evt.preventDefault();
  if (keyboard === true) {
    var tab = $(".tab-pane.active")[0].id;
  } else {
    var tab = $(evt.target).closest(".tab-pane")[0].id;
  }
  var selectorPart = "";
  if (tab !== "tab1") {
    selectorPart = "_" + tab;
  }
  initSOM(tab);
  resetSom(tab);
}
function trainStopSomEvent(evt, keyboard = false) {
  evt.preventDefault();
  if (keyboard === true) {
    var tab = $(".tab-pane.active")[0].id;
  } else {
    var tab = $(evt.target).closest(".tab-pane")[0].id;
  }
  window[tab].learningJustFinished = true;
}

cloneGlobalsFromTab("tab1");

function getLocalStorageHistory() {
  if (window.saveOnServer && (document.location.protocol === "http:" || document.location.protocol === "https:")) {
    console.warn("called with http protocol!");
    return {};
  } else if (!window.saveToLocalStorage) {
    return window.SOMAIA_HISTORY;
  }
  var history_raw = localStorage.getItem("somaia_history");
  var history;
  try {
    history = LZString.decompress(history_raw);
  } catch (e) {
    console.warn(e);
    history = {};
    return history;
  }
  if (!history) {
    history = {};
  } else {
    try {
      history = JSON.parse(history);
    } catch (e) {
      console.warn(e);
      history = {};
    }
  }
  return history;
}
function saveLocalStorageHistory(history, tab) {
  if (window.saveOnServer && (document.location.protocol === "http:" || document.location.protocol === "https:")) {
    saveHistoryToFile(history, window.saveCompressed);
    return true;
  } else if (!window.saveToLocalStorage) {
    window.SOMAIA_HISTORY = history;
    return true;
  }
  var somaia_history_keys = Object.keys(history[tab]).sort(function (a, b) { // newest to oldest //
    var a = +a, b = +b;
    return b - a;
  });
  var latestKey = somaia_history_keys[0], origTab = tab;
  var stringified_input = JSON.stringify(history);
  var err = false;
  var deletedKeys = [];
  try {
    var compressed_input = LZString.compress(stringified_input);
    console.info("Trying to save somaia_history of length (raw: "+stringified_input.length+", compressed: "+compressed_input.length+")");
    localStorage.setItem("somaia_history", compressed_input);
  } catch (e) {
    console.warn("Couldn't save somaia_history: ", e)
    err = true;
    var c = 0, stop = false;
    if ("undefined" !== typeof history && Object.size(history[tab]) > 0) {
      if ("undefined" === typeof history[tab] || Object.size(history[tab]) === 0) {
        var history_keys = Object.keys(history);
        for (var i = 0; i < history_keys.length; i++) {
          var newTab = history_keys[i];
          if (newTab !== tab && "undefined" !== typeof history[newTab] && Object.size(history[newTab]) > 0) {
            tab = history_keys[i];
            break;
          }
        }
      }
      if ("undefined" !== typeof history[tab] && Object.size(history[tab]) > 0) {
        while (err && c < 100 && !stop) {
          var somaia_history_keys = Object.keys(history[tab]).sort(function (a, b) { // oldest to newest //
            var a = +a, b = +b;
            return a - b;
          });
          if (somaia_history_keys.length > 0 && !(tab === origTab && latestKey === somaia_history_keys[0])) {
            // let's delete older entries EXCEPT the currently saved one //
            var oldestKey = somaia_history_keys[0];
            delete history[tab][oldestKey];
            deletedKeys.push([tab,oldestKey]);
            console.info("deleting somaia_history["+tab+"]["+oldestKey+"]");
            var errLoc = false;
            try {
              var stringified = JSON.stringify(history);
              var compressed = LZString.compress(stringified);
              console.info("Trying to save somaia_history of length (raw: "+stringified.length+", compressed: "+compressed.length+")");
              localStorage.setItem("somaia_history", compressed);
            } catch(e2) {
              console.log(e2)
              errLoc = true;
            } finally {
              if (!errLoc) {
                err = false;
                break;
              }
            }
          } else {
            // let's try to find another tab with entries in it //
            var history_keys = Object.keys(history);
            var foundTab = false;
            for (var i = 0; i < history_keys.length; i++) {
              var newTab = history_keys[i];
              if (newTab !== tab && newTab !== origTab && "undefined" !== typeof history[newTab] && Object.size(history[newTab]) > 0) {
                tab = history_keys[i];
                foundTab = true;
                break;
              }
            }
            if (!foundTab) {
              console.warn("No more tabs with history items to delete!")
              break;
            }
            
            var somaia_history_keys = Object.keys(history[tab]).sort(function (a, b) { // oldest to newest //
              var a = +a, b = +b;
              return a - b;
            });
            if (somaia_history_keys.length > 0) {
              // let's delete older entries  //
              var oldestKey = somaia_history_keys[0];
              delete history[tab][oldestKey];
              deletedKeys.push([tab,oldestKey]);
              console.info("deleting somaia_history["+tab+"]["+oldestKey+"]");
              var errLoc = false;
              try {
                var stringified = JSON.stringify(history);
                var compressed = LZString.compress(stringified);
                console.info("Trying to save somaia_history of length (raw: "+stringified.length+", compressed: "+compressed.length+")");
                localStorage.setItem("somaia_history", compressed);
              } catch(e2) {
                console.warn(e2)
                errLoc = true;
              } finally {
                if (!errLoc) {
                  err = false;
                  break;
                }
              }
            } else {
              // shouldn't happen: we looked for a tab with entries //
              stop = true;
              break;
            }
            c++;
          }
        }
      } else {
        console.warn("No tab history items to delete!")
      }
    } else {
      console.warn("Trying to save undefined or empty somaia_history!");
    }
  } finally {
    if (err) {
//       try {
//         localStorage.setItem("somaia_history", stringified_input);
//       } catch(e3) {
//         console.warn("Couldn't resave original: ", e3)
//       }
    } else {
      console.info("somaia_history saved successfully");
      if (deletedKeys.length > 0) {
        for (var i = 0; i < deletedKeys.length; i++) {
          var dTab = deletedKeys[i][0],
              dKey = deletedKeys[i][1];
          $("#"+dTab+" #"+dKey).remove();
        }
      }
    }
  }
  return !err;
}
function saveToLocalStorageHistory(tab) {
  var now = new Date().getTime();
  if (window.saveToLocalStorage || (document.location.protocol !== "http:" && document.location.protocol !== "https:")) {
    var history = getLocalStorageHistory();
  } else if (window.saveOnServer) {
    var history = {};
  } else {
    var history = window.SOMAIA_HISTORY;
  }
  if ("undefined" === typeof history[tab]) {
    history[tab] = {};
  }
  
  var toSave = {_matrices: [],_nonmatrices: [],_arrays: [], _emptyObjects: []};
  if ("undefined" === typeof debug) {
    debugLoc = false;
  } else {
    debugLoc = debug;
  }
  var fromTab = tab;
  for (var fromTabKey in window[fromTab]) {
      if (window[fromTab].hasOwnProperty(fromTabKey)) {
        if (fromTabKey === "som" ||fromTabKey === "somOrig") continue;
        if ("function" === typeof window[fromTab][fromTabKey]) continue;
        if ("object" === typeof window[fromTab][fromTabKey]) {
          if (window[fromTab][fromTabKey] instanceof Array) {
            toSave[fromTabKey] = window[fromTab][fromTabKey];
            toSave._arrays.push(fromTabKey)
          } else {
            if (Object.size(window[fromTab][fromTabKey]) === 0) {
              toSave[fromTabKey] = {};
              toSave._emptyObjects.push(fromTabKey)
            } else {
              if (window[fromTab][fromTabKey].isMatrix === true) {
                toSave[fromTabKey] = window[fromTab][fromTabKey].toArray();
                toSave._matrices.push(fromTabKey)
              } else {
                debugLoc && console.warn(fromTabKey + " is an undefined object on tab " + tabID);
              }
            }
          }
        } else {
          toSave[fromTabKey] = window[fromTab][fromTabKey];
          toSave._nonmatrices.push(fromTabKey)
        }
      }
  }
  debugLoc && console.info("FINISHED cloning from " + fromTab)
  var canvasID = "somTraining";
  if (tab !== "tab1") {
    canvasID = canvasID + "_" + tab;
  }
  var canvas = document.getElementById(canvasID);
  var base64img = canvas.toDataURL();
  toSave.doIterate = false;
  toSave.learningJustFinished = false;
  toSave.learningFinished = true;
  toSave.initFromHistory = true;
  toSave.base64img = base64img;
  history[tab][now] = toSave;
  while (Object.size(history[tab]) > 10) {
    var somaia_history_keys = Object.keys(history[tab]).sort(function (a, b) { // oldest to newest //
      var a = +a, b = +b;
      return a - b;
    });
    if (somaia_history_keys.length > 0) {
      var oldestKey = somaia_history_keys[0];
      delete history[tab][oldestKey];
      console.info("deleting somaia_history["+tab+"]["+oldestKey+"]");
    }
  }
  var res = saveLocalStorageHistory(history, tab);
  
  if (res) {
    $("#"+tab+" #"+oldestKey).remove();
    $("#"+tab+" .historyImgContainer img").removeClass("active");
    var imgEl = $("<img/>", {
      id: now,
      src: base64img,
      class: "active"
    }).click(function (event) {
      if (window.saveToLocalStorage || window.saveOnServer) $("body").addClass("disabled");
      setTimeout(function() {
        restoreFromLocalStorageHistory(event)
      }, 0);
    }).prependTo("#"+tab+" .historyImgContainer");
  } else {
    alert("Výsledok bol príliš veľký, aby sa uložil.")
  }
}
function restoreFromLocalStorageHistory(event) {
  var tab = $(event.target).closest(".tab-pane")[0].id;
  if (window.saveToLocalStorage && document.location.protocol !== "http:" && document.location.protocol !== "https:") {
    var history = getLocalStorageHistory();
  } else if (window.saveOnServer) {
    var singleHistory = readSingleHistoryFromFile(tab, event.target.id, window.saveCompressed);
    var history = {}; history[tab] = {}; history[tab][event.target.id] = singleHistory;
  } else {
    var history = window.SOMAIA_HISTORY;
  }
  if ("undefined" === typeof history[tab]) {
    history[tab] = {};
    console.warn("no history for tab "+tab+"; removing all history images");
    $("#"+tab+" .historyImgContainer img").remove();
    if (window.saveToLocalStorage || window.saveOnServer) $("body").removeClass("disabled");
    return;
  }
  if ("undefined" === typeof history[tab][event.target.id]) {
    console.warn("There is no history record for the requested img (#"+event.target.id+"); removing img!")
    $(event.target).remove();
    if (window.saveToLocalStorage || window.saveOnServer) $("body").removeClass("disabled");
    return;
  } else {
    var restoreFrom = history[tab][event.target.id];
  }
  if (window[tab].doIterate === true) {
    console.log("An active learning process is running!");
    if (window.saveToLocalStorage || window.saveOnServer) $("body").removeClass("disabled");
    return;
  }
  $("#"+tab+" .historyImgContainer img").removeClass("active");
  $(event.target).addClass("active");
  restoreFrom.doIterate = false;
  restoreFrom.learningJustFinished = false;
  restoreFrom.initFromHistory = true;
  restoreFrom.learningFinished = true;
  debug && console.log(restoreFrom.GridDistance)
  var arrays = restoreFrom._arrays,
      matrices = restoreFrom._matrices,
      emptyObjects = restoreFrom._emptyObjects,
      nonmatrices = restoreFrom._nonmatrices;
  debug && console.log(matrices,arrays,nonmatrices,emptyObjects)
  for (var i = 0; i < nonmatrices.length; i++) {
    if ("undefined" === nonmatrices[i] || "undefined" === restoreFrom[nonmatrices[i]]) {
      console.warn(nonmatrices[i], restoreFrom[nonmatrices[i]])
    } else {
      if ("function" === typeof restoreFrom[nonmatrices[i]]) continue;
      window[tab][nonmatrices[i]] = restoreFrom[nonmatrices[i]];
    }
  }
  for (var i = 0; i < emptyObjects.length; i++) {
    window[tab][emptyObjects[i]] = {};
  }
  for (var i = 0; i < arrays.length; i++) {
    if ("undefined" === arrays[i] || "undefined" === restoreFrom[arrays[i]]) {
      console.warn(arrays[i], restoreFrom[arrays[i]])
    } else {
      window[tab][arrays[i]] = restoreFrom[arrays[i]];
    }
  }
  for (var i = 0; i < matrices.length; i++) {
    if ("undefined" === matrices[i] || "undefined" === restoreFrom[matrices[i]]) {
      console.warn(matrices[i], restoreFrom[matrices[i]])
    } else {
      window[tab][matrices[i]] = cloneArray(restoreFrom[matrices[i]]);
    }
  }
  resetSomToAfterTraining(tab);
  if (window.saveToLocalStorage || window.saveOnServer) $("body").removeClass("disabled");
}

// set up events and initialize elements //
$(document).ready(function() {
  for(tabID in tabs) {
    var tab = tabs[tabID];
    var selectorPart = "";
    if (tab !== "tab1") {
      selectorPart = "_" + tab;
    }
    $("#trainSomButton"+selectorPart).click(function(evt) {trainSomEvent(evt);});
    $("#resetSomButton"+selectorPart).click(function(evt) {resetSomEvent(evt);});
    $("#trainStopSomButton"+selectorPart).click(function(evt) {trainStopSomEvent(evt);});
    jQuery(window).off().on("keydown", function(evt) {
      if (evt.keyCode === 0 || evt.keyCode === 32 || evt.which === 32) {
        // spacebar //
        trainSomEvent(evt, true);
        return false;
      } else if (evt.keyCode === 83 || evt.which === 83) {
        // "s" //
        trainStopSomEvent(evt, true);
        return false;
      } else if (evt.keyCode === 27 || evt.which === 27) {
        // Esc //
        resetSomEvent(evt, true);
        return false;
      }
      // console.log(evt);
    });
    
    // inicialize the history slider //
    $('#sat_historySliderInput'+selectorPart).slider({
      tooltip_position: 'bottom',
      formatter: function(value) {
        var language = $("#language_switcher").val().toLowerCase();
        var languageID = lang_ids[language];
        var dictionary = lang_strings;
        if (dictionary.hasOwnProperty(languageID) && "undefined" !== typeof dictionary[languageID].iteration) {
          return dictionary[languageID].iteration + ": " + value;
        }
        return 'Iterácia: ' + value;
      }
    });
    // bind slide and click events //
    $("#sat_historySliderInput"+selectorPart).on("slide", function(slideEvt) {
      var tab = $(slideEvt.target).closest(".tab-pane")[0].id;
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }
      window[tab].showHistoryIteration = slideEvt.value;
    })
    $("#sat_historySlider"+selectorPart).on("click", function(event) {
      var tab = $(event.target).closest(".tab-pane")[0].id;
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }
      var val = +$("#sat_historySliderInput"+selectorPart).val();
      $('#sat_historySliderInput'+selectorPart).slider('setAttribute', 'value', val);
      window[tab].showHistoryIteration = val;
    });
  
    // incialize the input setting sliders //
    $("#"+tab+" .somConstants").slider({
      tooltip: 'always',
      tooltip_position: 'bottom',
      formatter: function(value) {
        return value;
      }
    });
    // bind slide and click events //
    $("#"+tab+" .somConstants").on("slide", function(slideEvt) {
      var tab = $(slideEvt.target).closest(".tab-pane")[0].id;
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }

      var varName = slideEvt.target.id.replace("const_", "").replace(selectorPart, "");
      var val = slideEvt.value;
      if ("string" === typeof varName && "number" === typeof val && val >= 0) {
        window[tab][varName] = val;
        if (varName === "somH") {
          window[tab].somW = val;
          initSOM(tab);
          if (tab === "tab1" && tab1.inputShapeType === "random_pts") {
            setInputShape(tab1.inputShapeType);
            initSOM(tab);
          }
        }
        resetSom(tab);
      } else if ("string" === typeof varName && "object" === typeof val && val.hasOwnProperty("length") && val.length === 2) {
        // setting a range //
        window[tab][varName] = val;
        initSOM(tab);
        resetSom(tab);
      }
    });
    $("#"+tab+" div.slider").filter(function() {
      var tab = $(this).closest(".tab-pane")[0].id;
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }
      return this.id.replace(selectorPart, "").match(/^const_.*Slider$/);
    }).on("click", function(event) {
      var tab = $(event.target).closest(".tab-pane")[0].id;
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }
      var t = event.target;
      if (!$(t).hasClass("slider")) {
        t = $(t).closest(".slider")[0];
      }
      var inputID = t.id.replace("Slider", "");
      if ($("#"+inputID)) {
        var val = $("#"+inputID).val();
        if (val.indexOf(",") !== -1) {
          val = JSON.parse("["+val+"]");
        } else {
          val = +val;
        }
        $("#"+inputID).slider('setAttribute', 'value', val);
        var varName = t.id.replace("const_", "").replace("Slider", "").replace(selectorPart, "");
        if ("string" === typeof varName && "number" === typeof val && val >= 0) {
          window[tab][varName] = val;
          if (varName === "somH") {
            window[tab].somW = val;
            window[tab].mapRadius = window[tab].GridDistance([0,0],[window[tab].somW-1,window[tab].somH-1])/2;
            initSOM(tab);
            if (tab === "tab1" && tab1.inputShapeType === "random_pts") {
              setInputShape(tab1.inputShapeType);
              initSOM(tab);
            }
          }
          resetSom(tab);
        } else if ("string" === typeof varName && "object" === typeof val && val.hasOwnProperty("length") && val.length === 2) {
          // setting a range //
          window[tab][varName] = val;
          initSOM(tab);
          resetSom(tab);
        }
      }
    });
  
    // set dropdowns: initially selected value and bind change event //
    var dropdowns = ["InputShape", "Theta", "LearningRate", "NeighbourhoodRadius", "GridDistance", "InputSelectionType"];
    for (var i = 0; i < Object.size(dropdowns); i++) {
      var dropdown = dropdowns[i];
      var selectID = "const_" + dropdown + selectorPart;
      var defaultValVarName = "default" + dropdown + "Type";
      var defaultVal = window[tab][defaultValVarName];
//       var fnName = "set"+dropdown;
      $("#"+selectID+" option[value=" + defaultVal + "]").attr("selected", "selected");
      $("#"+selectID).change(function(event) {
        var tab = $(event.target).closest(".tab-pane")[0].id;
        var selectorPart = "";
        if (tab !== "tab1") {
          selectorPart = "_" + tab;
        }
        var selectID = this.id;
        var selectedType = $("#"+selectID+" option:selected").val();
        var dropdown = selectID.replace("const_", "").replace(selectorPart, "");
        var fnName = "set"+dropdown;
        window[fnName](selectedType, tab);
        initSOM(tab);
        resetSom(tab);
      });
    }
    
    // set multiselect dropdown(s) //
    var multiSelectDropdowns = ["InputColors"];
    for (var i = 0; i < multiSelectDropdowns.length; i++) {
      var multiSelectDropdown = multiSelectDropdowns[i];
      var selectID = "const_" + multiSelectDropdown + selectorPart;
      var defaultValVarName = "default" + multiSelectDropdown;
      var defaultVals = window[tab][defaultValVarName]; // array of arrays!
//       var fnName = "set"+multiSelectDropdown;
      var elements = $("#"+selectID);
      if (elements.length > 0) {
        elements.multiselect({
          // includeSelectAllOption: true,
          enableFiltering: true,
          enableFullValueFiltering: true,
          enableCaseInsensitiveFiltering: true,
          enableReplaceDiacritics: true,
          enableHTML: true,
          numberDisplayed: 10,
          buttonTitle: function(options, select) {
            var labels = [];
            options.each(function () {
              var text = $(this).text();
              var textEl = $(text);
              var div = $("<div/>");
              $(div).append(textEl)
              var title = $(div).children("span.title");
              var name = $(div).children("span.title").innerHTML;
              var titleText = title.html().trim();
              if (titleText.length > 0) {
                labels.push(title.html());
              } else {
                labels.push("?")
              }
            });
            return labels.join(', ');
          },
          templates: {
            li: '<li class="multiselect-item regular"><a href="javascript:void(0);"><label></label></a></li>'
          }
        });
        if ("undefined" !== typeof defaultVals && defaultVals instanceof Array && defaultVals.length > 0) {
          for (var j = 0; j < defaultVals.length; j++) {
            var defaultVal = defaultVals[j];
            var defaultValString = "["+defaultVal.toString()+"]";
            elements.multiselect('select', defaultValString);
          }
        }
        elements.change(function(event) {
          var tab = $(event.target).closest(".tab-pane")[0].id;
          var selectorPart = "";
          if (tab !== "tab1") {
            selectorPart = "_" + tab;
          }
          var selectID = this.id;
          var multiSelectDropdown = selectID.replace("const_", "").replace(selectorPart, "");
          var selectedValStrings = $(event.target).val();
          if (selectedValStrings.length === 0 && $(event.target).data("errorIfEmpty") === true) {
            alert("Aspoň jedna možnosť musí byť vybraná!");
            var curValVarName = multiSelectDropdown;
            var curVals = window[tab][curValVarName]; // array of arrays!
            if ("undefined" !== typeof curVals && curVals instanceof Array && curVals.length > 0) {
              for (var j = 0; j < curVals.length; j++) {
                var curVal = curVals[j];
                var curValString = "["+curVal.toString()+"]";
                $(this).multiselect('select', curValString);
              }
            }
          } else {
            var selectedVals = [];
            for (var i = 0; i < selectedValStrings.length; i++) {
              selectedVals[i] = JSON.parse(selectedValStrings[i]);
            }
            var fnName = "set"+multiSelectDropdown;
            window[fnName](selectedVals, tab);
            resetSom(tab);
          }
          $("#"+tab+" .multiselect-selected-text span.col-square").each(function (key, item) {
            setColorSquareColor(item);
          });
          $(this).multiselect("refresh");
        });
      }
    }
  }

  // tab2 specific - colors: //
  $("#tab2 span.col-square").each(function (key, item) {
    setColorSquareColor(item);
  });
  $(document).on("contextmenu", ".floatingPointLabel", function(e){
    e.preventDefault();
    $(e.target).remove();
  });

  setTimeout(function() {
    if (window.saveToLocalStorage && (document.location.protocol !== "http:" && document.location.protocol !== "https:")) {
      var somaia_history = getLocalStorageHistory(); // all needed
    } else if (window.saveOnServer) {
      var somaia_history = readWholeHistoryFromFile(window.saveCompressed);
    } else {
      var somaia_history = window.SOMAIA_HISTORY;
    }
    for(tabID in tabs) {
      var tab = tabs[tabID];
      var selectorPart = "";
      if (tab !== "tab1") {
        selectorPart = "_" + tab;
      }
    
      if ("undefined" !== typeof somaia_history[tab]) {
        var somaia_history_keys = Object.keys(somaia_history[tab]).sort(function (a, b) { // oldest to newest //
          var a = +a, b = +b;
          return a - b;
        });
        var saveNeeded = false;
        for (var i = 0; i < somaia_history_keys.length; i++) {
          var key = somaia_history_keys[i];
          if (i >= 10) {
            if (window.saveToLocalStorage && document.location.protocol !== "http:" && document.location.protocol !== "https:") {
              delete somaia_history[tab][key];
              console.info("deleting somaia_history["+tab+"]["+key+"]");
              saveNeeded = true;
              continue;
            } else {
              break;
            }
          }
          var base64img = somaia_history[tab][key].base64img;
          var imgEl = $("<img/>", {
            id: key,
            src: base64img,
          }).click(function(event) {
            if (window.saveToLocalStorage || window.saveOnServer) $("body").addClass("disabled");
            setTimeout(function() {
              restoreFromLocalStorageHistory(event)
            }, 0);
          }).prependTo("#"+tab+" .historyImgContainer");
        }
        if (saveNeeded) {
          saveLocalStorageHistory(somaia_history, tab);
        }
      }
    }
  }, 0);

  // fix misplaced labels //
  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    $('.somConstants').slider("refresh");
  });
  
  // this function fills #colored_countries //
  setColoredCountries = function() {
    if (undefined !== typeof tab4.inputLabelColors && undefined !== typeof tab4.inputLabelColors._names && tab4.inputLabelColors._names.length > 0) {
      var colouredCountryNames = [];
      for (var key in tab4.inputLabelColors._names) {
        var country = tab4.inputLabelColors._names[key];
        var countryColor = tab4.inputLabelColors[country];
        var countryID = country.toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        var language = $("#language_switcher").val().toLowerCase();
        var languageID = lang_ids[language];
        var dictionary = lang_strings;
        if (dictionary.hasOwnProperty(languageID) && "undefined" !== typeof dictionary[languageID][countryID]) {
          var translatedCountry = dictionary[languageID][countryID];
        } else {
          var translatedCountry = country;
        }
        if ("undefined" !== typeof countryColor) {
          var rgbColorString = math.round(math.multiply(countryColor, 255)).toString();
          colouredCountryNames.push('<span style="color: rgb('+rgbColorString+')">'+translatedCountry+'</span>')
        }
      }
      if (colouredCountryNames.length > 0) {
        var colouredCountryNamesText = colouredCountryNames.join(", ");
        $("#colored_countries").html(colouredCountryNamesText);
      }
    }
  }
  setColoredCountries();
  
  // language switching function //
  set_lang = function (dictionary) {
    $("[data-translate]").html(function () {
      var key = $(this).data("translate");
      if (dictionary.hasOwnProperty(key)) {
        return dictionary[key];
      }
    });
  };
  // language switcher dropdown callback function //
  $("#language_switcher").on("change", function () {
    var language = $(this).val().toLowerCase();
    var languageID = lang_ids[language];
    var dictionary = lang_strings;
    if (dictionary.hasOwnProperty(languageID)) {
      set_lang(dictionary[languageID]);
      $("select[multiple=multiple]").multiselect("refresh");
      $(".sat_historySliderInput").slider('refresh');
      setColoredCountries();
    }
  });
});