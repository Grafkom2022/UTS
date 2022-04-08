"use strict";

var canvas;
var gl;

var primitiveType;
var offset = 0;
var count = 12;
	
var colorUniformLocation;
var translation = [0, 0]; //top-left of rectangle
var angle = 0;
var angleInRadians = 0;
var scale = [1.0,1.0]; //default scale
var matrix;
var matrixLocation;
var translationMatrix;
var rotationMatrix;
var scaleMatrix;
var moveOriginMatrix; //move origin to 'center' of the letter as center of rotation
var projectionMatrix;

var movement = 1;
var currentposition = 0;
var scalefactor = 0.0025;
var currentscale = 0.005;
var middlewidth = 0;

// Direction of animation
var leftToRight = true;
var counterclockwise = true;
var scaleUp = true;
var isStopped = false; // Whether game & animation is running / not

// Location of flowers with different color
var differentColorLocation1 = Math.floor(Math.random() * 33);
var differentColorLocation2 = Math.floor(Math.random() * 33);

// Current color scheme
var currentColor = 1;

// Color scheme variables
var darkCheckerColor;
var lightCheckerColor;
var darkFlowerColor;
var lightFlowerColor;
var darkDiffColor;
var lightDiffColor;

// Possible colors of flowers with different color (indexes 0-1 is for the first color scheme & so on)
var diffColors = [
	[148/255, 5/255, 66/255],
	[240/255, 8/255, 74/255],
	[181/255, 34/255, 112/255],
	[247/255, 45/255, 173/255],
	[230/255, 154/255, 191/255],
	[245/255, 191/255, 232/255],
	[253/255, 210/255, 64/255],
	[237/255, 216/255, 173/255],
	[15/255, 247/255, 23/255],
	[66/255, 255/255, 61/255]
];

// Time elapsed since game starts
var time = 0;
// Shortest time taken to find 1 flower with different color
var bestTime;

// Change time in timer display
function timer() {
	const element = document.getElementById("timer");   
 	let seconds = 0;
  	const id = setInterval(timerInc, 1000);
  	function timerInc() {
    	if (isStopped) {
      		clearInterval(time);
			  seconds = 0;
    	} else {
      		seconds++;
      		element.innerHTML = seconds + 's'; 
    	}
  	}
}

// Start timer & determine initial color scheme
$(document).ready(function(){
	currentColor = 1;
	setColor(currentColor);
	timer();
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

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var letterbuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, letterbuffer );

	
    // Associate out shader variables with our data buffer
	
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

	colorUniformLocation = gl.getUniformLocation(program, "u_color");
	
	matrixLocation = gl.getUniformLocation(program, "u_matrix");
    middlewidth = Math.floor(gl.canvas.width/2);

	// Create texture for color picking
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1099.71, 610.95, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.generateMipmap(gl.TEXTURE_2D);

	// Allocate framebuffer for color picking
	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

	// Attach framebuffer to texture
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	// Check framebuffer completeness
	if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
		alert("Framebuffer incomplete");
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	//Animation & color toggle
    document.getElementById("translation").addEventListener("click", function() {
		leftToRight = !leftToRight;
	});
	document.getElementById("rotation").addEventListener("click", function() {
		counterclockwise = !counterclockwise;
	});
	document.getElementById("scale").addEventListener("click", function() {
		scaleUp = !scaleUp;
	});
	document.getElementById("play").addEventListener("click", function() {
		if (isStopped) {
			// Restart game when play button is clicked
			currentposition = 0;
			currentscale = 0.005;
			angle = 0;
			differentColorLocation1 = Math.floor(Math.random() * 33);
			differentColorLocation2 = Math.floor(Math.random() * 33);
			// Hide win message, disable play button, restart timer & animation at the start of a game
			$("#win-message").prop("hidden", true);
			$("#play").addClass("disabled");
			$("#play").attr("aria-disabled", "true");
			document.getElementById("timer").innerHTML = "0s";
			timer();
			isStopped = false;
		}
	});
	document.getElementById("color").addEventListener("click", function() {
		// Change color scheme when "change color" button is pressed
		if (currentColor == 5) {
			currentColor = 1;
		} else {
			currentColor += 1;
		}
		setColor(currentColor);
		// Do everything needed to restart a game after color scheme is changed
		currentposition = 0;
		currentscale = 0.005;
		angle = 0;
		differentColorLocation1 = Math.floor(Math.random() * 33);
		differentColorLocation2 = Math.floor(Math.random() * 33);
		$("#win-message").prop("hidden", true);
		$("#play").addClass("disabled");
		$("#play").attr("aria-disabled", "true");
		clearInterval(time);
		document.getElementById("timer").innerHTML = "0s";
		timer();
		isStopped = false;
	});

	// Add event listener for clicks in canvas
	canvas.addEventListener("mousedown", function(event){
		// Bind framebuffer & redraw to read color
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.clear( gl.COLOR_BUFFER_BIT );

		if (!isStopped) {
			currentposition = (leftToRight) ? currentposition + movement : currentposition - movement;
			currentscale = (scaleUp) ? currentscale + scalefactor : currentscale - scalefactor;
			angle = (counterclockwise) ? angle + 1.0 : angle - 1.0;
		}
		
		if (currentposition > 1099.71) {
			currentposition = 1099.71;
			movement = -movement;
			
		}; 
		if (currentposition < 0) {
			currentposition = 0; 
			movement = -movement;
		}; 
	
		if (currentscale > 0.35){
			currentscale = 0.35;
			scalefactor = -scalefactor;
		};
		
		if (currentscale < 0.005){
			currentscale = 0.005;
			scalefactor = -scalefactor;
		};	

		for(var i = 0; i < 5; i++) {
			for(var j = 0; j < 9; j++) {
				drawSquare(j*122.19, i*122.19);
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);
				} else {
					gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1)
				}
			}
		}
	
		for(var i = 0; i < 5; i++) {
			for(var j = 0; j < 9; j++) {
				if ((j + i * 9) == differentColorLocation1) {
					if ((j + i * 9) % 2 == 0) {
						gl.uniform4f(colorUniformLocation, darkDiffColor[0], darkDiffColor[1], darkDiffColor[2], 1);
						drawTriangleFlower(j*122.19, i*122.19);
					} else {
						gl.uniform4f(colorUniformLocation, lightDiffColor[0], lightDiffColor[1], lightDiffColor[2], 1);
						drawDiamondFlower(j*122.19, i*122.19);
					}
				} else {
					if ((j + i * 9) % 2 == 0) {
						gl.uniform4f(colorUniformLocation, darkFlowerColor[0], darkFlowerColor[1], darkFlowerColor[2], 1);
						drawTriangleFlower(j*122.19, i*122.19);
					} else {
						gl.uniform4f(colorUniformLocation, lightFlowerColor[0], lightFlowerColor[1], lightFlowerColor[2], 1);
						drawDiamondFlower(j*122.19, i*122.19);
					}
				}
			}
		}

		gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);
	
		
		for(var i = 0; i < 5; i++) {
			for(var j = 0; j < 9; j++) {
				drawSquare(j*122.19 - 1099.71, i*122.19);
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1);
				} else {
					gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);
				}
			}
		}
	
		for(var i = 0; i < 5; i++) {
			for(var j = 0; j < 9; j++) {
				if ((j + i * 9) == differentColorLocation2) {
					if ((j + i * 9) % 2 == 0) {
						gl.uniform4f(colorUniformLocation, lightDiffColor[0], lightDiffColor[1], lightDiffColor[2], 1);
						drawDiamondFlower(j*122.19 - 1099.71, i*122.19);
					} else {
						gl.uniform4f(colorUniformLocation, darkDiffColor[0], darkDiffColor[1], darkDiffColor[2], 1);
						drawTriangleFlower(j*122.19 - 1099.71, i*122.19);
					}
				} else {
					if ((j + i * 9) % 2 == 0) {
						gl.uniform4f(colorUniformLocation, lightFlowerColor[0], lightFlowerColor[1], lightFlowerColor[2], 1);
						drawDiamondFlower(j*122.19 - 1099.71, i*122.19);
					} else {
						gl.uniform4f(colorUniformLocation, darkFlowerColor[0], darkFlowerColor[1], darkFlowerColor[2], 1);
						drawTriangleFlower(j*122.19 - 1099.71, i*122.19);
					}
				}
			}
		}
		
		gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1);

		// Get click position
		var x = event.clientX;
		var y = canvas.height - event.clientY;

		// Create buffer to read color data
		var pickedColor = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);

		// Read color at click position
		gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickedColor);

		var index = currentColor * 2 - 1;

		// Stop game if color is different
		if ((pickedColor[0] == diffColors[index][0]*255 && diffColors[index][1]*255 && pickedColor[2] == diffColors[index][2]*255) || 
		(pickedColor[0] == diffColors[index - 1][0]*255 && pickedColor[1] == diffColors[index - 1][1]*255 && 
		pickedColor[2] == diffColors[index - 1][2]*255)) {
			isStopped = true;
			clearInterval(time);
			let currentTime = parseInt($("#timer").text());
			if (currentTime < bestTime || bestTime == null) {
				bestTime = currentTime;
			}
			$("#win-message").prop("hidden", false);
			$("#stats").html(`
				Time: ${$("#timer").text()}<br>
            	Best Time: ${bestTime}s<br>
			`);
			$("#play").removeClass("disabled");
			$("#play").attr("aria-disabled", "false");
		}
	});

	primitiveType = gl.TRIANGLES;
	render(); //default render
}

function render() 
{
	// Animate if game is not stopped
	if (!isStopped) {
		currentposition = (leftToRight) ? currentposition + movement : currentposition - movement;
		currentscale = (scaleUp) ? currentscale + scalefactor : currentscale - scalefactor;
		angle = (counterclockwise) ? angle + 1.0 : angle - 1.0;
	}
	
	if (currentposition > 1099.71) {
		currentposition = 1099.71;
		movement = -movement;
		
	}; 
	if (currentposition < 0) {
		currentposition = 0; 
		movement = -movement;
	}; 

	if (currentscale > 0.35){
		currentscale = 0.35;
		scalefactor = -scalefactor;
	};
	
	if (currentscale < 0.005){
		currentscale = 0.005;
		scalefactor = -scalefactor;
	};

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear( gl.COLOR_BUFFER_BIT );

	for(var i = 0; i < 5; i++) {
		for(var j = 0; j < 9; j++) {
			drawSquare(j*122.19, i*122.19);
			if ((j + i * 9) % 2 == 0) {
				gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);
			} else {
				gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1)
			}
		}
	}

	for(var i = 0; i < 5; i++) {
		for(var j = 0; j < 9; j++) {
			if ((j + i * 9) == differentColorLocation1) {
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, darkDiffColor[0], darkDiffColor[1], darkDiffColor[2], 1);
					drawTriangleFlower(j*122.19, i*122.19);
				} else {
					gl.uniform4f(colorUniformLocation, lightDiffColor[0], lightDiffColor[1], lightDiffColor[2], 1);
					drawDiamondFlower(j*122.19, i*122.19);
				}
			} else {
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, darkFlowerColor[0], darkFlowerColor[1], darkFlowerColor[2], 1);
					drawTriangleFlower(j*122.19, i*122.19);
				} else {
					gl.uniform4f(colorUniformLocation, lightFlowerColor[0], lightFlowerColor[1], lightFlowerColor[2], 1);
					drawDiamondFlower(j*122.19, i*122.19);
				}
			}
		}
	}

	gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);

	
	for(var i = 0; i < 5; i++) {
		for(var j = 0; j < 9; j++) {
			drawSquare(j*122.19 - 1099.71, i*122.19);
			if ((j + i * 9) % 2 == 0) {
				gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1);
			} else {
				gl.uniform4f(colorUniformLocation, lightCheckerColor[0], lightCheckerColor[1], lightCheckerColor[2], 1);
			}
		}
	}

	for(var i = 0; i < 5; i++) {
		for(var j = 0; j < 9; j++) {
			if ((j + i * 9) == differentColorLocation2) {
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, lightDiffColor[0], lightDiffColor[1], lightDiffColor[2], 1);
					drawDiamondFlower(j*122.19 - 1099.71, i*122.19);
				} else {
					gl.uniform4f(colorUniformLocation, darkDiffColor[0], darkDiffColor[1], darkDiffColor[2], 1);
					drawTriangleFlower(j*122.19 - 1099.71, i*122.19);
				}
			} else {
				if ((j + i * 9) % 2 == 0) {
					gl.uniform4f(colorUniformLocation, lightFlowerColor[0], lightFlowerColor[1], lightFlowerColor[2], 1);
					drawDiamondFlower(j*122.19 - 1099.71, i*122.19);
				} else {
					gl.uniform4f(colorUniformLocation, darkFlowerColor[0], darkFlowerColor[1], darkFlowerColor[2], 1);
					drawTriangleFlower(j*122.19 - 1099.71, i*122.19);
				}
			}
		}
	}
	
	gl.uniform4f(colorUniformLocation, darkCheckerColor[0], darkCheckerColor[1], darkCheckerColor[2], 1);
	
	requestAnimationFrame(render); //refresh
	
}

function drawTriangleFlower(xtranslation, ytranslation) {
	count = 15; //number of vertices 
	translation = [middlewidth-488 + xtranslation,gl.canvas.height/2-242 + ytranslation];
	
	angleInRadians = 360 - (angle * Math.PI/180); //rotating counter clockwise

	setGeometry(gl,1);
	
	matrix = m3.identity();
	
	projectionMatrix = m3.projection(gl.canvas.width, gl.canvas.height);
	translationMatrix = m3.translation(translation[0] + currentposition, translation[1]);
    rotationMatrix = m3.rotation(-angleInRadians);
    scaleMatrix = m3.scaling(scale[0] - currentscale, scale[1] - currentscale);
	moveOriginMatrix = m3.translation(-44.13, -40.73);
	
    // Multiply the matrices.
    matrix = m3.multiply(projectionMatrix, translationMatrix);
    matrix = m3.multiply(matrix, rotationMatrix);
	matrix = m3.multiply(matrix, scaleMatrix);
	matrix = m3.multiply(matrix, moveOriginMatrix);
	
    // Set the matrix.
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

	//gl.clear( gl.COLOR_BUFFER_BIT );
	gl.drawArrays( primitiveType, offset, count );
	
	
}

function drawDiamondFlower(xtranslation, ytranslation) {
	count = 24; //number of vertices 
	
	setGeometry(gl,2); 
	
	translation=[middlewidth-488 + xtranslation,gl.canvas.height/2-242 + ytranslation];
	
	angleInRadians = (angle * Math.PI/180); //rotating counter clockwise
    matrix = m3.identity();
	projectionMatrix = m3.projection(gl.canvas.width, gl.canvas.height);
	translationMatrix = m3.translation(translation[0] + currentposition, translation[1]);
    rotationMatrix = m3.rotation(angleInRadians);
    scaleMatrix = m3.scaling(scale[0]  + currentscale, scale[1]  + currentscale);
	moveOriginMatrix = m3.translation(-40.73, -40.73);
	
    // Multiply the matrices.
    matrix = m3.multiply(projectionMatrix, translationMatrix);
    matrix = m3.multiply(matrix, rotationMatrix);
	matrix = m3.multiply(matrix, scaleMatrix);
	matrix = m3.multiply(matrix, moveOriginMatrix);
	
    // Set the matrix.
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

	//gl.clear( gl.COLOR_BUFFER_BIT );
	gl.drawArrays( primitiveType, offset, count );
	
	
}

function drawSquare(xtranslation, ytranslation) {
	count = 6; //number of vertices 
	
	setGeometry(gl,3); 
	
	translation=[xtranslation, ytranslation];
	
	angleInRadians = (angle * Math.PI/180); //rotating counter clockwise
    matrix = m3.identity();
	projectionMatrix = m3.projection(gl.canvas.width, gl.canvas.height);
	translationMatrix = m3.translation(translation[0] + currentposition, translation[1]);
	moveOriginMatrix = m3.translation(0, 0);
	
    // Multiply the matrices.
    matrix = m3.multiply(projectionMatrix, translationMatrix);
	matrix = m3.multiply(matrix, moveOriginMatrix);
	
    // Set the matrix.
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

	//gl.clear( gl.COLOR_BUFFER_BIT );
	gl.drawArrays( primitiveType, offset, count );
	
}

var m3 = { 						//setup 3x3 transformation matrix object
   identity: function() {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
   },
   
   projection: function(width, height) {
    // Note: This matrix flips the Y axis so that 0 is at the top.
    return [
      2 / width, 0, 0,
      0, -2 / height, 0,
      -1, 1, 1
    ];
   },

  translation: function(tx, ty) {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ];
  },

  rotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c,-s, 0,
      s, c, 0,
      0, 0, 1,
    ];
  },

  scaling: function(sx, sy) {
    return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 3 + 0];
    var a01 = a[0 * 3 + 1];
    var a02 = a[0 * 3 + 2];
    var a10 = a[1 * 3 + 0];
    var a11 = a[1 * 3 + 1];
    var a12 = a[1 * 3 + 2];
    var a20 = a[2 * 3 + 0];
    var a21 = a[2 * 3 + 1];
    var a22 = a[2 * 3 + 2];
    var b00 = b[0 * 3 + 0];
    var b01 = b[0 * 3 + 1];
    var b02 = b[0 * 3 + 2];
    var b10 = b[1 * 3 + 0];
    var b11 = b[1 * 3 + 1];
    var b12 = b[1 * 3 + 2];
    var b20 = b[2 * 3 + 0];
    var b21 = b[2 * 3 + 1];
    var b22 = b[2 * 3 + 2];
    return [
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22,
    ];
  },
};


function setGeometry(gl, shape) {
  switch (shape) {
	  case 1:                     // Fill the buffer with the values that define a flower with triangular petals.
		  gl.bufferData(
			  gl.ARRAY_BUFFER,
			  new Float32Array([
				  61.58, 0,
				  26.68, 0,
				  44.13, 40.73,
		  
				  11.25, 11.55,
				  0, 44.74,
				  44.13, 40.73,
		  
				  6.07, 63.43,
				  34.3, 83.94,
				  44.13, 40.73,
		  
				  53.82, 83.94,
				  82.18, 63.43,
				  44.13, 40.73,
		  
				  88.26, 44.74,
				  77.48, 11.55,
				  44.13, 40.73,
				 
			  ]),
			  gl.STATIC_DRAW);
	  
	  break;
	  case 2: 				// Fill the buffer with the values that define a flower with diamond-shaped petals.
	    gl.bufferData(
		  gl.ARRAY_BUFFER,
		  new Float32Array([
			  40.73, 0,
			  27.15, 20.36,
			  54.3, 20.36,
			  54.3, 20.36,
			  27.15, 20.36,
			  40.73, 40.73,
			  
			  20.36, 27.15,
			  0, 40.73,
			  20.36, 54.3,
			  20.36, 27.15,
			  20.36, 54.3,
			  40.73, 40.73,

			  40.73, 40.73,
			  27.15, 61.09,
			  54.3, 61.09,
			  54.3, 61.09,
			  27.15, 61.09,
			  40.73, 81.46,

			  61.09, 27.15,
			  40.73, 40.73,
			  61.09, 54.3,
			  61.09, 27.15,
			  61.09, 54.3,
			  81.46, 40.73,
		  ]),
		  gl.STATIC_DRAW);
	  
	  break;
	  case 3: 				// Fill the buffer with the values that define a square.
	    gl.bufferData(
		  gl.ARRAY_BUFFER,
		  new Float32Array([
			  0, 0,
			  122.19, 0,
			  122.19, 122.19,
			  122.19, 122.19,
			  0, 122.19,
			  0, 0,
		  ]),
		  gl.STATIC_DRAW);
	  
	  break;
	  
  }
}

function setColor(scheme) {
	switch (scheme) {
		case 1:                     // Define a cyan-red color scheme for canvas & sidebar.
		  darkCheckerColor = [0.08, 0.89, 0.91];
		  lightCheckerColor = [0.54, 0.91, 0.89];
		  darkFlowerColor = [0.58, 0.02, 0.06];
		  lightFlowerColor = [0.94, 0.03, 0.09];
		  darkDiffColor = [148/255, 5/255, 66/255];
		  lightDiffColor = [240/255, 8/255, 74/255];
		  $('h1, .text, #hint-1, .timer-row').css({"color": '#14e3e8'});
		  $('.win-message').css({"background-color": '#14e3e8'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus')
		  	.css({"background-color": '#14e3e8'});
		  $('.sidebar').css({"background-color": '#94060f'});
		  $('.buttons-2, .win-message, #hint-2').css({"color": '#94060f'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus').css({"color": '#94060f'});
		break;
		case 2: 				// Define a pastel green-magenta color scheme for canvas & sidebar.
		  darkCheckerColor = [0.16, 0.88, 0.73];
		  lightCheckerColor = [0.74, 0.95, 0.85];
		  darkFlowerColor = [0.71, 0.13, 0.64];
		  lightFlowerColor = [0.97, 0.18, 0.88];
		  darkDiffColor = [181/255, 34/255, 112/255];
		  lightDiffColor = [247/255, 45/255, 173/255];
		  $('h1, .text, #hint-1, .timer-row').css({"color": '#bdf2d9'});
		  $('.win-message').css({"background-color": '#bdf2d9'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus')
		  	.css({"background-color": '#bdf2d9'});
		  $('.sidebar').css({"background-color": '#b522a4'});
		  $('.buttons-2, .win-message, #hint-2').css({"color": '#b522a4'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus').css({"color": '#b522a4'});
		break;
		case 3: 				// Define a purple-peach color scheme for canvas & sidebar.
		  darkCheckerColor = [0.37, 0.29, 0.54];
		  lightCheckerColor = [0.49, 0.41, 0.66];
		  darkFlowerColor = [0.90, 0.60, 0.55];
		  lightFlowerColor = [0.96, 0.75, 0.71];
		  darkDiffColor = [230/255, 154/255, 191/255];
		  lightDiffColor = [245/255, 191/255, 232/255];
		  $('h1, .text, #hint-1, .timer-row').css({"color": '#5f4b8b'});
		  $('.win-message').css({"background-color": '#5f4b8b'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus')
		  	.css({"background-color": '#5f4b8b'});
		  $('.sidebar').css({"background-color": '#f5bfb5'});
		  $('.buttons-2, .win-message, #hint-2').css({"color": '#f5bfb5'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus').css({"color": '#f5bfb5'});
		break;
		case 4: 				// Define a red-yellow color scheme for canvas & sidebar.
	      darkCheckerColor = [0.66, 0.10, 0.04];
		  lightCheckerColor = [0.98, 0.22, 0.13];
		  darkFlowerColor = [0.99, 0.82, 0.05];
		  lightFlowerColor = [0.93, 0.85, 0.48];
		  darkDiffColor = [253/255, 210/255, 64/255];
		  lightDiffColor = [237/255, 216/255, 173/255];
		  $('h1, .text, #hint-1, .timer-row').css({"color": '#a81a0a'});
		  $('.win-message').css({"background-color": '#a81a0a'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus')
		  	.css({"background-color": '#a81a0a'});
		  $('.sidebar').css({"background-color": '#fdd20e'});
		  $('.buttons-2, .win-message, #hint-2').css({"color": '#fdd20e'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus').css({"color": '#fdd20e'});
		break;
		case 5: 				// Define a blue-green color scheme for canvas & sidebar.
		  darkCheckerColor = [0.13, 0.31, 0.45];
		  lightCheckerColor = [0.08, 0.44, 0.69];
		  darkFlowerColor = [0.06, 0.97, 0.29];
		  lightFlowerColor = [0.26, 1.00, 0.44];
		  darkDiffColor = [15/255, 247/255, 23/255];
		  lightDiffColor = [66/255, 255/255, 61/255];
		  $('h1, .text, #hint-1, .timer-row').css({"color": '#205072'});
		  $('.win-message').css({"background-color": '#205072'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus')
		  	.css({"background-color": '#205072'});
		  $('.sidebar').css({"background-color": '#0ff749'});
		  $('.buttons-2, .win-message, #hint-2').css({"color": '#0ff749'});
		  $('.btn-custom, .btn-custom:hover, .btn-custom:focus, .btn-custom:active, .btn-custom:active:focus').css({"color": '#0ff749'});
		break;
	}
  }