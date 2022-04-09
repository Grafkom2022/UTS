"use strict";

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGL2RenderingContext} */
var gl;

// parameter variables
var middlewidth;
var primitiveType;
var offset = 0;
var translation;
var rotation = [0,0,0];
var scale = [1.0,1.0,1.0]; //default scale
var currentposition = 0;
var currentscale = 0.5;
var angle = 30;
var angleInRadians;
var posDegX = 0;
var posDegY = 0;
var posDegFlag = 0;
var Oedge = 90;
var Hedge = 50;
var H1dist = 90;
var H2dist = 210;

// matrix variables
var matrixLocation;
var translationMatrix;
var rotationMatrix;
var scaleMatrix;
var projectionMatrix;
var cameraMatrix;
var viewMatrix;
var viewProjectionMatrix;

// Interactive variables
var cameraID = 0;
var isOVisible = true;
var isH1Visible = true;
var isH2Visible = true;

var FOV_Radians; //field of view
var aspect; //projection aspect ratio
var zNear; //near view volume
var zFar;  //far view volume

var cameraPosition;
var up = [0, 1, 0]; // up vector
var position = [0, 0, 0]; // where the camera looks at

// program variables
var program;
var positionBuffer;
var positionLocation;
var colorBuffer;
var colorLocation;

// Select initial camera position
$(document).ready(function(){
	$("#default-cam").css({"background-color" : "#7062bf"});
});

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

  //initial default
  FOV_Radians = degToRad(60);
  aspect = canvas.width / canvas.height;
  zNear = 1;
  zFar = 3000;
	
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
  
  // Camera toggle
  document.getElementById("default-cam").addEventListener("click", function() {
		cameraID = 0;
    position = [0, 0, 0];
    $(".btn").css({"background-color" : "#9381ff"});
    $("#default-cam").css({"background-color" : "#7062bf"});
	});
  document.getElementById("O-cam").addEventListener("click", function() {
		cameraID = 1;
    position = [0, 0, 0];
    $(".btn").css({"background-color" : "#9381ff"});
    $("#O-cam").css({"background-color" : "#7062bf"});
	});
  document.getElementById("H1-cam").addEventListener("click", function() {
		cameraID = 2;
    position = [translation[0]-currentposition/2, translation[1], translation[2]]; // look at object O
    $(".btn").css({"background-color" : "#9381ff"});
    $("#H1-cam").css({"background-color" : "#7062bf"});
	});
  document.getElementById("H2-cam").addEventListener("click", function() {
		cameraID = 3;
    position = [translation[0]-currentposition/2, translation[1], translation[2]]; // look at object O
    $(".btn").css({"background-color" : "#9381ff"});
    $("#H2-cam").css({"background-color" : "#7062bf"});
	});

  // Object visibility toggle
  document.getElementById("O-visibility").addEventListener("click", function() {
		isOVisible = !isOVisible;
    if (!isOVisible) {
      $("#O-visibility").html('<i class="bi bi-eye-slash"></i>');
    } else {
      $("#O-visibility").html('<i class="bi bi-eye"></i>');
    }
	});
  document.getElementById("H1-visibility").addEventListener("click", function () {
      isH1Visible = !isH1Visible;
      if (!isH1Visible) {
        $("#H1-visibility").html('<i class="bi bi-eye-slash"></i>');
      } else {
        $("#H1-visibility").html('<i class="bi bi-eye"></i>');
      }
  });
  document.getElementById("H2-visibility").addEventListener("click", function() {
		isH2Visible = !isH2Visible;
    if (!isH2Visible) {
      $("#H2-visibility").html('<i class="bi bi-eye-slash"></i>');
    } else {
      $("#H2-visibility").html('<i class="bi bi-eye"></i>');
    }
	});
	
	primitiveType = gl.TRIANGLES;
  middlewidth = Math.floor(gl.canvas.width/2);
  translation = [middlewidth,gl.canvas.height/2,0];
  
	render(); //default render
}


function render() 
{
  // update angle based on revolution
	
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
	angleInRadians = 360 + (angle * Math.PI/180); // rotating counter clockwise
	
  // clear buffer before rendering object
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (isOVisible) {
    drawobjectO();
  }
  if (isH1Visible) {
    drawobjectH1();
  }
  if (isH2Visible) {
    drawobjectH2();
  }
  requestAnimationFrame(render);
}

function drawobjectO() {
  var side = 6;
  var count = side*6;

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,0);

  // Set camera position according to the chosen option
  setCameraPosition(cameraID);
	
  // Compute the camera's matrix using look at.
  cameraMatrix = m4.lookAt(cameraPosition, position, up);

  // Make a view matrix from the camera matrix
  viewMatrix = m4.inverse(cameraMatrix);
  projectionMatrix = m4.perspective(FOV_Radians, aspect, zNear, zFar); //setup perspective viewing volume
  
  // Compute the matrices
  var matrix = m4.multiply(projectionMatrix, viewMatrix);
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

  var og_offset = Oedge+H1dist;

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,1);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,1);

  // Set camera position according to the chosen option
  setCameraPosition(cameraID);

  // Compute the camera's matrix using look at.
  cameraMatrix = m4.lookAt(cameraPosition, position, up);

  // Make a view matrix from the camera matrix
  viewMatrix = m4.inverse(cameraMatrix);
  projectionMatrix = m4.perspective(FOV_Radians, aspect, zNear, zFar); //setup perspective viewing volume
  
  // Compute the matrices
  var matrix = m4.multiply(projectionMatrix, viewMatrix);
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

  var og_offset = Oedge+H2dist;

  // bind buffers before setting geometry and colors
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  setGeometry(gl,1);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl,2);

  // Set camera position according to the chosen option
  setCameraPosition(cameraID);
  
  // Compute the camera's matrix using look at.
  cameraMatrix = m4.lookAt(cameraPosition, position, up);

  // Make a view matrix from the camera matrix
  viewMatrix = m4.inverse(cameraMatrix);
  projectionMatrix = m4.perspective(FOV_Radians, aspect, zNear, zFar); //setup perspective viewing volume
  
  // Compute the matrices
  var matrix = m4.multiply(projectionMatrix, viewMatrix);
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

function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // make sure we don't divide by 0.
  if (length > 0.00001){
    return [v[0] / length, v[1] / length, v[2] / length];
  } else{
    return [0, 0, 0];
  }
}

function cross(a, b){
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

// matrix operations
var m4 = {

  lookAt: function(cameraPosition, target, up){
    var zAxis = normalize(subtractVectors(cameraPosition, target));
    var xAxis = cross(up, zAxis);
    var yAxis = cross(zAxis, xAxis);

    return [
       xAxis[0], xAxis[1], xAxis[2], 0,
       yAxis[0], yAxis[1], yAxis[2], 0,
       zAxis[0], zAxis[1], zAxis[2], 0,
       cameraPosition[0],
       cameraPosition[1],
       cameraPosition[2],
       1,
    ];
  },

  perspective: function(fieldOfViewInRadians, aspect, near, far){
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
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

  inverse: function(m){
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
            (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
            (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
            (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
            (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
            (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
            (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
            (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
            (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
            (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
            (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
            (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
            (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
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
  var temp;
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
  var temp;
  if (colorIndex == 0) temp = OColor;
  else if (colorIndex == 1) temp = H1Color;
  else if (colorIndex == 2) temp = H2Color;
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array(temp),
      gl.STATIC_DRAW);
}

// Set camera position according to the chosen option
function setCameraPosition(cameraID) {
  var cameraMatrix = m4.translation(0, 0, 0);
  switch (cameraID) {
    case 0: // Move camera to default viewer position
      cameraMatrix = m4.translate(cameraMatrix, 1500, 1500, 0);
    break;
    case 1: // Move camera to the center of object O
      cameraMatrix = m4.translate(cameraMatrix, translation[0]-currentposition/2, translation[1], translation[2]);
    break;
    case 2: // Move camera to the center of object H1 & revolve around the center of object O
      var og_offset = Oedge+H1dist;
      cameraMatrix = m4.translate(cameraMatrix, og_offset*Math.cos(degToRad(posDegX)),-og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.translate(cameraMatrix, translation[0]+currentposition/2, translation[1], translation[2]);
      cameraMatrix = m4.translate(cameraMatrix, -og_offset*Math.cos(degToRad(posDegX)),0,0);
      cameraMatrix = m4.yRotate(cameraMatrix, rotation[1]-angleInRadians*4*Math.cos(degToRad(posDegX)));
      cameraMatrix = m4.translate(cameraMatrix, og_offset*Math.cos(degToRad(posDegX)),0,0);
      cameraMatrix = m4.yRotate(cameraMatrix, rotation[1]+angleInRadians*4*Math.cos(degToRad(posDegX)));
      cameraMatrix = m4.translate(cameraMatrix, 0,og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.xRotate(cameraMatrix, rotation[0]-angleInRadians*4*Math.cos(degToRad(posDegY)));
      cameraMatrix = m4.translate(cameraMatrix, 0,-og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.xRotate(cameraMatrix, rotation[0]+angleInRadians*4*Math.cos(degToRad(posDegY)));
    break;
    case 3: // Move camera to the center of object H2 & revolve around the center of object O
      var og_offset = Oedge+H2dist;
      cameraMatrix = m4.translate(cameraMatrix, -og_offset*Math.cos(degToRad(posDegX)),-og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.translate(cameraMatrix, translation[0]+currentposition/2, translation[1], translation[2]);
      cameraMatrix = m4.translate(cameraMatrix, og_offset*Math.cos(degToRad(posDegX)),0,0);
      cameraMatrix = m4.yRotate(cameraMatrix, rotation[1]-angleInRadians*4*Math.cos(degToRad(posDegX)));
      cameraMatrix = m4.translate(cameraMatrix, -og_offset*Math.cos(degToRad(posDegX)),0,0);
      cameraMatrix = m4.yRotate(cameraMatrix, rotation[1]+angleInRadians*4*Math.cos(degToRad(posDegX)));
      cameraMatrix = m4.translate(cameraMatrix, 0,og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.xRotate(cameraMatrix, rotation[0]+angleInRadians*4*Math.cos(degToRad(posDegY)));
      cameraMatrix = m4.translate(cameraMatrix, 0,-og_offset*Math.cos(degToRad(posDegY)),0);
      cameraMatrix = m4.xRotate(cameraMatrix, rotation[0]-angleInRadians*4*Math.cos(degToRad(posDegY)));
    break;
  }
  cameraPosition = [
      cameraMatrix[12],
      cameraMatrix[13],
      cameraMatrix[14],
  ];
}