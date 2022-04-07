"use strict";

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

var maxPoints = 5000;
var maxNumPositions  = 3*maxPoints;
var index = 0;
var midpoints = [];
var pointAccuracy = 0.02;  // range from 0 to 1

// program variables
var program;
var vBuffer;
var positionLoc;
var cBuffer;
var colorLoc;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0,0,0, 1.0);


    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // set points from event
    document.getElementById("wind-directions").addEventListener("click",function() {
        initvBuffer();
        mplx(-1,1,1,-1);    // nw to se
        mplx(-1,-1,1,1);    // sw to ne
        mplx(-1,0,1,0);     // w to e
        mply(0,-1,0,1);     // s to n
        draw();
    });
    document.getElementById("octagram").addEventListener("click",function() {
        initvBuffer();
        mplx(-1,0,1,1);     // w to ne
        mplx(-1,0,1,-1);    // w to se
        mplx(-1,-1,1,0);    // sw to e
        mplx(-1,1,1,0);     // nw to e

        mply(-1,-1,0,1);    // sw to n
        mply(1,-1,0,1);     // se to n
        mply(0,-1,-1,1);    // s to nw
        mply(0,-1,1,1);     // s to ne
        draw();
    });
    document.getElementById("fan-spread").addEventListener("click",function() {
        initvBuffer();
        for (var i=-1;i<=1;i+=0.1) mply(i,-1,-1,1);
        draw();
    });
    
    draw();

}

function initvBuffer() {
    index = 0;
    midpoints = [];
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumPositions, gl.STATIC_DRAW);

    positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumPositions, gl.STATIC_DRAW );

    colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);
}

/*
usable from line with degree of 0 to 45.
state coordinate leftmost point first, then rightmost.
*/
function mplx(x1,y1,x2,y2) {
    var xi = x1;
    var yi = y1;
    if (y1>y2) var polarity = -1;
    else var polarity = 1;
    midpoints.push(vec2(xi,yi));
    
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var D = 2 * dy - dx;
    var incE = 2 * dy;
    var incNE = 2 * (dy - dx);
    while (xi<x2) {
        if (D <= 0) {
            D = D + incE;
        }
        else {
            D = D + incNE;
            yi += pointAccuracy*polarity;
        }
        xi += pointAccuracy;
        midpoints.push(vec2(xi,yi));
    }
}

/*
usable from line with degree of 45 to 90.
state coordinate leftmost point first, then rightmost.
*/
function mply(x1,y1,x2,y2) { // use polarity to add/subtract y
    var xi = x1;
    var yi = y1;
    if (x1>x2) var polarity = -1;
    else var polarity = 1;
    midpoints.push(vec2(xi,yi));
    
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var D = 2 * dx - dy;
    var incE = 2 * dx;
    var incNE = 2 * (dx - dy);
    while (yi<y2) {
        if (D <= 0) {
            D = D + incE;
        }
        else {
            D = D + incNE;
            xi += pointAccuracy*polarity;
        }
        yi += pointAccuracy;
        midpoints.push(vec2(xi,yi));
    }
}

function draw() {
    // load data to buffer
    for (let i in midpoints) {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        var t = midpoints[i];
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        t = vec4(1,1,1,1);
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));
        index++;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i<index; i++)
        gl.drawArrays(gl.POINTS, 0, index);
}
