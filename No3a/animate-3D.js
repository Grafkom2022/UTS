"use strict";

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGL2RenderingContext} */
var gl;

// parameter variables
var primitiveType;
var offset = 0;
var translation;
var rotation = [0,0,0];
var scale = [1.0,1.0,1.0]; //default scale
var currentposition = 0;
var currentscale = 0.005;
var movement = 10;
var scalefactor = 0.005;
var maxscale = 1;
var minscale = 0.005;
var angle = 0;
var angleInRadians;
var posDegX = 0;
var posDegY = 0;
var posDegFlag = 0;

// matrix variables
var matrix;
var matrixLocation;
var translationMatrix;
var rotationMatrix;
var scaleMatrix;
var projectionMatrix;

// program variables
var program;
var positionBuffer;
var positionLocation;
var colorBuffer;
var colorLocation;

// misc variables
var middlewidth;
var temp;


window.onload = function init()
{
  canvas = document.getElementById( "gl-canvas" );

  gl = canvas.getContext('webgl2');
  if (!gl) alert("WebGL 2.0 isn't available");

  //
  //  Configure WebGL
  //
  gl.viewport( 0, 0, canvas.width, canvas.height );
  gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
  
  gl.enable(gl.DEPTH_TEST);
	
  //  Load shaders and initialize attribute buffers
  program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  // Associate position location and color location
  positionBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );

  positionLocation = gl.getAttribLocation( program, "a_position" );
  gl.vertexAttribPointer( positionLocation, 3, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( positionLocation );

  colorBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );

  colorLocation = gl.getAttribLocation(program, "a_color");
  gl.vertexAttribPointer(colorLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.enableVertexAttribArray( colorLocation );

	matrixLocation = gl.getUniformLocation(program, "u_matrix");
	
	primitiveType = gl.TRIANGLES;
  middlewidth = Math.floor(gl.canvas.width/2);
  
	render(); //default render
}


function render() 
{
  // update angle based on revolution
  currentscale = 0.5;
	
  if (angle != 0 && angle%90 == 0) {
    if (posDegX == 180 && posDegY == 180) posDegFlag = 1;
    if (posDegX == 0 && posDegY == 0) posDegFlag = 0;
    if (posDegFlag == 0) {
      if (posDegX == 180) {
        posDegY += 90;
      }
      else posDegX += 90;
      
    } else if (posDegFlag == 1) {
      if (posDegX == 0) {
        posDegY -= 90;
      }
      else posDegX -= 90;
      
    }
  }

	angle += 1.0;
  console.log(posDegX,posDegY);
	angleInRadians = 360 + (angle * Math.PI/180); //rotating counter clockwise
	
  // clear buffer before rendering object
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawobjectO();
  drawobjectH1();
  drawobjectH2();
  requestAnimationFrame(render);
}

function drawobjectO() {
  var side = 6;
  var count = side*6;

	translation = [middlewidth,gl.canvas.height/2,0];

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,0);
	// Compute the matrices
  matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 4000);
  matrix = m4.translate(matrix, translation[0]-currentposition/2, translation[1], translation[2]);  // move object to center of canvas
  matrix = m4.yRotate(matrix, rotation[1]-angleInRadians);  // rotate object counter clockwise from center
  matrix = m4.scale(matrix, scale[0]+currentscale, scale[1]+currentscale, scale[2]+currentscale); // scale object model
  matrix = m4.translate(matrix, -Oedge/2,-Oedge/2,-Oedge/2);  // move origin to center
  // Set the matrix.
  gl.uniformMatrix4fv(matrixLocation, false, matrix);
  gl.drawArrays( primitiveType, offset, count );
}

function drawobjectH1() {
  var side = 6;
  var count = side*6;
  var distance = 90;

  var og_offset = Oedge+distance;

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,1);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,1);
  
  // Compute the matrices
  matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 4000);
  matrix = m4.translate(matrix, og_offset*Math.cos(degToRad(posDegX)),-og_offset*Math.cos(degToRad(posDegY)),0);  // move object to 2 o'clock position from center
  matrix = m4.translate(matrix, translation[0]+currentposition/2, translation[1], translation[2]);  // move object to center of canvas

  // implement orbit rotation y
  matrix = m4.translate(matrix, -og_offset*Math.cos(degToRad(posDegX)),0,0);
  matrix = m4.yRotate(matrix, rotation[1]-angleInRadians*4*Math.cos(degToRad(posDegX)));
  matrix = m4.translate(matrix, og_offset*Math.cos(degToRad(posDegX)),0,0);
  matrix = m4.yRotate(matrix, rotation[1]+angleInRadians*4*Math.cos(degToRad(posDegX)));
  
  // implement orbit rotation x
  matrix = m4.translate(matrix, 0,og_offset*Math.cos(degToRad(posDegY)),0);
  matrix = m4.xRotate(matrix, rotation[0]-angleInRadians*4*Math.cos(degToRad(posDegY)));
  matrix = m4.translate(matrix, 0,-og_offset*Math.cos(degToRad(posDegY)),0);
  matrix = m4.xRotate(matrix, rotation[0]+angleInRadians*4*Math.cos(degToRad(posDegY)));

  matrix = m4.yRotate(matrix, rotation[1]-angleInRadians*3); // rotate object counter clockwise from center
  matrix = m4.scale(matrix, scale[0]+currentscale, scale[1]+currentscale, scale[2]+currentscale); // scale object model
  matrix = m4.translate(matrix, -Hedge/2,-Hedge/2,-Hedge/2); // move origin to center
  // Set the matrix.
  gl.uniformMatrix4fv(matrixLocation, false, matrix);
  gl.drawArrays( primitiveType, offset, count );
}

function drawobjectH2() {
  var side = 6;
  var count = side*6;
  var distance = 210;

  var og_offset = Oedge+distance;
  translation = [middlewidth,gl.canvas.height/2,0];

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,1);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,2);
  
  // Compute the matrices
  matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 4000);
  matrix = m4.translate(matrix, -og_offset*Math.cos(degToRad(posDegX)),-og_offset*Math.cos(degToRad(posDegY)),0);  // move object to 2 o'clock position from center
  matrix = m4.translate(matrix, translation[0]+currentposition/2, translation[1], translation[2]);  // move object to center of canvas

  // implement orbit rotation y
  matrix = m4.translate(matrix, og_offset*Math.cos(degToRad(posDegX)),0,0);
  matrix = m4.yRotate(matrix, rotation[1]-angleInRadians*4*Math.cos(degToRad(posDegX)));
  matrix = m4.translate(matrix, -og_offset*Math.cos(degToRad(posDegX)),0,0);
  matrix = m4.yRotate(matrix, rotation[1]+angleInRadians*4*Math.cos(degToRad(posDegX)));
  
  // implement orbit rotation x
  matrix = m4.translate(matrix, 0,og_offset*Math.cos(degToRad(posDegY)),0);
  matrix = m4.xRotate(matrix, rotation[0]+angleInRadians*4*Math.cos(degToRad(posDegY)));
  matrix = m4.translate(matrix, 0,-og_offset*Math.cos(degToRad(posDegY)),0);
  matrix = m4.xRotate(matrix, rotation[0]-angleInRadians*4*Math.cos(degToRad(posDegY)));

  matrix = m4.yRotate(matrix, rotation[1]-angleInRadians*3); // rotate object counter clockwise from center
  matrix = m4.scale(matrix, scale[0]+currentscale, scale[1]+currentscale, scale[2]+currentscale); // scale object model
  matrix = m4.translate(matrix, -Hedge/2,-Hedge/2,-Hedge/2); // move origin to center
  // Set the matrix.
  gl.uniformMatrix4fv(matrixLocation, false, matrix);
  gl.drawArrays( primitiveType, offset, count );
}


function radToDeg(r) {
  return r * 180 / Math.PI;
}
function degToRad(d) {
  return d * Math.PI / 180;
}

// matrix operations
var m4 = {

  projection: function(width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 2 / depth, 0,
      -1, 1, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },
  
  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },
  
};

// create object outline
var Oedge = 90;
var OobjectArray = [
  
  // front
  Oedge,0,Oedge,
  0,0,Oedge,
  Oedge,Oedge,Oedge,
  Oedge,Oedge,Oedge,
  0,0,Oedge,
  0,Oedge,Oedge,
  
  // back
  0,0,0,
  Oedge,0,0,
  0,Oedge,0,
  0,Oedge,0,
  Oedge,0,0,
  Oedge,Oedge,0,
  
  // left
  0,0,0,
  0,Oedge,0,
  0,0,Oedge,
  0,0,Oedge,
  0,Oedge,0,
  0,Oedge,Oedge,

  // right
	Oedge,0,0,
	Oedge,0,Oedge,
	Oedge,Oedge,0,
  Oedge,Oedge,Oedge,
  Oedge,Oedge,0,
  Oedge,0,Oedge,
  
  // top
  0,0,0,
  0,0,Oedge,
  Oedge,0,0,
  Oedge,0,0,
  0,0,Oedge,
  Oedge,0,Oedge,

  // bottom
  0,Oedge,0,
  Oedge,Oedge,0,
  0,Oedge,Oedge,
  0,Oedge,Oedge,
  Oedge,Oedge,0,
  Oedge,Oedge,Oedge,
]

var Hedge = 50;
var HobjectArray = [
  
  // front
  Hedge,0,Hedge,
  0,0,Hedge,
  Hedge,Hedge,Hedge,
  Hedge,Hedge,Hedge,
  0,0,Hedge,
  0,Hedge,Hedge,
  
  // back
  0,0,0,
  Hedge,0,0,
  0,Hedge,0,
  0,Hedge,0,
  Hedge,0,0,
  Hedge,Hedge,0,
  
  // left
  0,0,0,
  0,Hedge,0,
  0,0,Hedge,
  0,0,Hedge,
  0,Hedge,0,
  0,Hedge,Hedge,

  // right
	Hedge,0,0,
	Hedge,0,Hedge,
	Hedge,Hedge,0,
  Hedge,Hedge,Hedge,
  Hedge,Hedge,0,
  Hedge,0,Hedge,
  
  // top
  0,0,0,
  0,0,Hedge,
  Hedge,0,0,
  Hedge,0,0,
  0,0,Hedge,
  Hedge,0,Hedge,

  // bottom
  0,Hedge,0,
  Hedge,Hedge,0,
  0,Hedge,Hedge,
  0,Hedge,Hedge,
  Hedge,Hedge,0,
  Hedge,Hedge,Hedge,
]

// make color array for a side composed from 2 triangles
function colorSide(x,y,z) {
  return [x,y,z,
          x,y,z,
          x,y,z,
          x,y,z,
          x,y,z,
          x,y,z,]
}

// Fill geometry in buffer according to index
function setGeometry(gl,shapeIndex) {
  if (shapeIndex == 0) temp = OobjectArray;
  else if (shapeIndex == 1) temp = HobjectArray;
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(temp),
       gl.STATIC_DRAW);
}

// Creating color arrays
var OColor = [].concat(
  colorSide(0,0,255), // f
  colorSide(0,0,100), // b
  colorSide(0,0,200), // l
  colorSide(0,0,120), // r
  colorSide(0,0,150), // u
  colorSide(0,0,80), // d
);
var H1Color = [].concat(
  colorSide(255,0,0), // f
  colorSide(100,0,0), // b
  colorSide(200,0,0), // l
  colorSide(120,0,0), // r
  colorSide(150,0,0), // u
  colorSide(80,0,0), // d
  );
  var H2Color = [].concat(
    colorSide(0,255,0), // f
    colorSide(0,100,0), // b
    colorSide(0,200,0), // l
    colorSide(0,120,0), // r
    colorSide(0,150,0), // u
    colorSide(0,80,0), // d
    );

// Fill color in buffer according to index
function setColors(gl,colorIndex) {
  if (colorIndex == 0) temp = OColor;
  else if (colorIndex == 1) temp = H1Color;
  else if (colorIndex == 2) temp = H2Color;
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array(temp),
      gl.STATIC_DRAW);
}