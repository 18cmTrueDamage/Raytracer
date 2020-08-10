var gl;
var canvas;
var shaderProgram;
var cubeTCoordBuffer;
var cubeVertexBuffer;
var cubeTriIndexBuffer;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var nMatrix = mat3.create();
var mvMatrixStack = [];
var cubeImage;
var cubeTexture;

var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var globalQuat = quat.create();

var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

ready_to_draw = false;

//texture
//gl.TEXTURE_CUBE_MAP_POSITIVE_X
//gl.TEXTURE_CUBE_MAP_NEGATIVE_X
//gl.TEXTURE_CUBE_MAP_POSITIVE_Y
//gl.TEXTURE_CUBE_MAP_NEGATIVE_Y
//gl.TEXTURE_CUBE_MAP_POSITIVE_Z
//gl.TEXTURE_CUBE_MAP_NEGATIVE_Z


function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

function uploadViewDirToShader(){
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}

function uploadRotateMatrixToShader(rotateMat){
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uRotateMat"), false, rotateMat);
}

function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
		try {
		  context = canvas.getContext(names[i]);
		} catch(e) {}
		if (context) {
		  break;
		}
	}
	if (context) {
		context.viewportWidth = canvas.width;
		context.viewportHeight = canvas.height;
	} else {
		alert("Failed to create WebGL context!");
	}
	return context;
}

function loadShaderFromDOM(id) {
	var shaderScript = document.getElementById(id);

	if (!shaderScript) {
		return null;
	}

	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	while (currentChild) {
		if (currentChild.nodeType == 3) {
			shaderSource += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	} 
	return shader;
}

function switchShaders(isSkybox){
	gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsSkybox"), isSkybox);
}

function setupShaders() {
	vertexShader = loadShaderFromDOM("shader-vs");
	fragmentShader = loadShaderFromDOM("shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Failed to setup shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

function setupBuffers(){
    setupSkybox();
	setupTeapotBuffers(teapot_mesh);
}

function draw() { 
    var translateVec = vec3.create();
    var scaleVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    mvPushMatrix();
	var rotateMat = mat4.create();
	mat4.rotateY(rotateMat, rotateMat, modelYRotationRadians);
	uploadRotateMatrixToShader(rotateMat);
    vec3.set(translateVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,translateVec);
    setMatrixUniforms();
	
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

	// Set lights
	uploadLightsToShader([0,20,0],[0.0,0.0,0.0],[0.3,0.3,0.3],[0.3,0.3,0.3]);
	
	// render the skybox
	switchShaders(true);
    drawSkybox();
    switchShaders(false);

	if (ready_to_draw){
		mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
		drawTeapot();
	}
	
    mvPopMatrix();
  
}

//render by time
function animate() {
    if (then==0)
    {
    	then = Date.now();
    }
    else
    {
		now=Date.now();
		now *= 0.001;
		var deltaTime = now - then;
		then = now;  
		
		//modelYRotationRadians += 0.01;
    }
}

function setupCubeMap() {
	cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);

	const sidedatas = [
  		{
    		target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
    		url: 'skybox/neg-x.jpg',
  		},
  		{
    		target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
    		url: 'skybox/pos-x.jpg',
  		},
  		{
    		target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
    		url: 'skybox/pos-y.jpg',
  		},
  		{
    		target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
    		url: 'skybox/neg-y.jpg',
  		},
  		{
    		target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
    		url: 'skybox/neg-z.jpg',
  		},
  		{
    		target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
    		url: 'skybox/pos-z.jpg',
  		},
	];
	//console.log(sidedatas[1].target, sidedatas[1].url)
	//gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
	//var cti = 0;
	//var imgs = new Array(6);
	sidedatas.forEach((sidedata) => {
  		const {target, url} = sidedata;
  		//console.log(target);
 
 		const image = new Image();

  		image.onload = function() {
    		handleTextureLoaded(target, image, cubeTexture);
  		};
  		
  		image.src = url;
  		//console.log(image);
	});

	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	
	//gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
 	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function handleTextureLoaded(target, image, texture){
 	//gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    console.log(image);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	gl.enable(gl.DEPTH_TEST);

	document.onkeydown = handleKeyDown;

	setupShaders();
	setupBuffers();
	
	setupCubeMap();
	tick();
}

function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

