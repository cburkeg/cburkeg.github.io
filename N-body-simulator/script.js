// *** Variable definitions ***

// bodies is the collection of N individual body objects
let bodies = {}

// numBodies is equal to N, the number of bodies in the sim
// Start with N = 3 initially, add the option to change later
let numBodies = 3

// canvasSize determines the size of the coordinate space for the bodies
let canvasSize = 1000

// stepSize determines the time between each "step" or "tick". Default value is 1.
// A higher stepSize gives a faster, less accurate simulation. A lower stepSize gives a more granular, slower simulation.
let stepSize = 1

// stepCount counts the number of steps that have taken place in the simulation.
let stepCount = 0

// The simulation stepLimit is a predetermined number of steps the simulation should run for.
// A value of 0 means there is no limit.
let stepLimit = 10000

// If simRun == 1, the simulation is running. If simRun == 0, the simulation is paused/stopped.
let simRun = 1

// Initialise the distanceMatrix. This is a 2D matrix transformmed into a 1D array, with each value in the array representing the distance between two bodies.
let distanceMatrix = []

// Initialise directionMatrix
let directionMatrix = []

// Initialise forceMatrix
let forceMatrix = []

// Set gravitational constant (constant of proportionality in force equations)
let G = 6.674 * 10 ** -5

// *** Document elements ***

let canvas = document.getElementById('space')
canvas.width = canvasSize
canvas.height = canvasSize

const ctx = canvas.getContext('2d')

let button = document.getElementById('simButton')
button.addEventListener('click', refreshSim)

// Initiate bodies

populateInitialBodies(bodies, numBodies)

randomisePosition(bodies, canvasSize, 0.75)

// Main simulation loop

while (simRun) {
  stepCount += 1
  simRun = checkStepCount(stepCount, stepLimit, simRun)
  updateBodiesPositions(bodies, stepSize)
  distanceMatrix = updateDistanceMatrix(distanceMatrix, bodies)
  directionMatrix = updateDirectionMatrix(
    directionMatrix,
    bodies,
    distanceMatrix
  )
  forceMatrix = updateForceMatrix(
    forceMatrix,
    bodies,
    distanceMatrix,
    directionMatrix,
    G
  )
  updateAcceleration(bodies, forceMatrix)
  updateVelocities(bodies, stepSize)
  drawBodies(ctx, bodies)
}

// *** Function definitions ***

function populateInitialBodies(bodies, numBodies) {
  for (let i = 0; i < numBodies; i++) {
    let bodyName = 'body' + i
    bodies[bodyName] = {}

    bodies[bodyName].positionX = 0
    bodies[bodyName].positionY = 0

    bodies[bodyName].velocityX = 0
    bodies[bodyName].velocityY = 0

    bodies[bodyName].forceX = 0
    bodies[bodyName].forceY = 0

    bodies[bodyName].accelerationX = 0
    bodies[bodyName].accelerationY = 0

    // Placeholder values of radius and mass at this stage
    bodies[bodyName].radius = 5
    bodies[bodyName].mass = 10000
  }
}

function randomisePosition(bodies, canvasSize, boundary) {
  // Spawn the initial bodies within a rectangle centred in the canvas
  // Each side of this rectangle is (boundary * canvas) long, for boundary <= 1

  for (let i = 0; i < Object.keys(bodies).length; i++) {
    let bodyID = 'body' + i

    bodies[bodyID].positionX =
      ((1 - boundary) / 2) * canvasSize + boundary * canvasSize * Math.random()

    bodies[bodyID].positionY =
      ((1 - boundary) / 2) * canvasSize + boundary * canvasSize * Math.random()
  }
}

function checkStepCount(stepCount, stepLimit, simRun) {
  if (stepLimit > 0) {
    if (stepCount >= stepLimit) {
      console.log('Simulation completed')
      return 0
    } else {
      return simRun
    }
  }
}

function updateBodiesPositions(bodies, stepSize) {
  // Update each body's position by adding the body's X/Y velocity multiplied by the step size to the body's X/Y position.

  for (let i = 0; i < Object.keys(bodies).length; i++) {
    let bodyID = 'body' + i
    bodies[bodyID].positionX += bodies[bodyID].velocityX * stepSize
    bodies[bodyID].positionY += bodies[bodyID].velocityY * stepSize
  }
}

function updateDistanceMatrix(distanceMatrix, bodies) {
  // Update the N*N distance matrix (matrix defining distance between body A and body B). Each entry in the matrix M[A, B] represents the distance from Body A to Body B
  // The matrix is then unravelled into a 1D array going left-to-right, top-to-bottom. L[n] then maps to M[A, B] (where L is the 1D vector and n is the array) with A = math.floor(n/N), and
  // B equals n%N (where N is numBodies)

  let N = Object.keys(bodies).length

  distanceMatrix = []

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (j == i) {
        distanceMatrix.push(0)
      } else {
        distanceMatrix.push(getDistance(bodies['body' + i], bodies['body' + j]))
      }
    }
  }

  return distanceMatrix
}

function getDistance(body1, body2) {
  // Return the scalar distance between body1 and body2
  return Math.sqrt(
    Math.abs(body1.positionX - body2.positionX) ** 2 +
      Math.abs(body1.positionY - body2.positionY) ** 2
  )
}

function updateDirectionMatrix(directionMatrix, bodies, distanceMatrix) {
  // Update the N*N matrix of standard vectors of length 1. M[A,B] is a vector pointing FROM body A TOWARDS body B. The matrix is represented by a 1D vector.
  // Each element in the 1D array is a tuple representing X and Y coordinates.

  let N = Object.keys(bodies).length

  directionMatrix = []

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (j == i) {
        directionMatrix.push([0, 0])
      } else {
        let xyTuple = []
        xyTuple.push(
          (bodies['body' + j].positionX - bodies['body' + i].positionX) /
            distanceMatrix[i * N + j]
        )
        xyTuple.push(
          (bodies['body' + j].positionY - bodies['body' + i].positionY) /
            distanceMatrix[i * N + j]
        )
        directionMatrix.push(xyTuple)
      }
    }
  }

  return directionMatrix
}

function updateForceMatrix(
  forceMatrix,
  bodies,
  distanceMatrix,
  directionMatrix,
  G
) {
  // Update the N*N force matrix (matrix defining forces between body A and body B).
  // The magnitude of the force is found using G, the bodies' mass, and the distance matrix.
  // The direction is determined by the direction matrix.

  let N = Object.keys(bodies).length

  forceMatrix = []

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (j == i) {
        forceMatrix.push([0, 0])
      } else {
        let xyForceTuple = []
        xyForceTuple.push(
          ((G * bodies['body' + j].mass * bodies['body' + i].mass) /
            distanceMatrix[i * N + j] ** 2) *
            directionMatrix[i * N + j][0]
        )
        xyForceTuple.push(
          ((G * bodies['body' + j].mass * bodies['body' + i].mass) /
            distanceMatrix[i * N + j] ** 2) *
            directionMatrix[i * N + j][1]
        )
        forceMatrix.push(xyForceTuple)
      }
    }
  }

  return forceMatrix
}

function updateAcceleration(bodies, forceMatrix) {
  // Determine X and Y accelerations for the bodies based on their mass and the force matrix.
  let N = Object.keys(bodies).length

  for (let i = 0; i < N; i++) {
    let bodyID = 'body' + i
    let forceNetX = 0
    let forceNetY = 0

    for (let j = i * N; j < (i + 1) * N; j++) {
      forceNetX += forceMatrix[j][0]
      forceNetY += forceMatrix[j][1]
    }

    bodies[bodyID].forceX = forceNetX
    bodies[bodyID].forceY = forceNetY

    bodies[bodyID].accelerationX = bodies[bodyID].forceX / bodies[bodyID].mass
    bodies[bodyID].accelerationY = bodies[bodyID].forceY / bodies[bodyID].mass
  }
}

function updateVelocities(bodies, stepSize) {
  // Update each body's velocity by adding the body's X/Y acceleration multiplied by the step size to the body's X/Y velocity.

  for (let i = 0; i < Object.keys(bodies).length; i++) {
    let bodyID = 'body' + i
    bodies[bodyID].velocityX += bodies[bodyID].accelerationX * stepSize
    bodies[bodyID].velocityY += bodies[bodyID].accelerationY * stepSize
  }
}

function drawBodies(ctx, bodies) {
  // Draw the bodies on the screen. At this stage, the canvas is not deleted/refreshed, so there is no animation.
  let N = Object.keys(bodies).length

  for (let i = 0; i < N; i++) {
    ctx.fillStyle = `rgb(${Math.floor(255 - (255 / N) * i)} 0 0)`
    let bodyID = 'body' + i
    ctx.fillRect(
      bodies[bodyID].positionX,
      bodies[bodyID].positionY,
      bodies[bodyID].radius,
      bodies[bodyID].radius
    )
  }
}

function refreshSim() {
  // Repeat running the simulation once the button is pressed.
  numBodies = document.getElementById('Nform').value
  stepLimit = document.getElementById('stepForm').value

  bodies = {}

  populateInitialBodies(bodies, numBodies)

  randomisePosition(bodies, canvasSize, 0.75)

  stepCount = 0
  simRun = 1

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  while (simRun) {
    stepCount += 1
    simRun = checkStepCount(stepCount, stepLimit, simRun)
    updateBodiesPositions(bodies, stepSize)
    distanceMatrix = updateDistanceMatrix(distanceMatrix, bodies)
    directionMatrix = updateDirectionMatrix(
      directionMatrix,
      bodies,
      distanceMatrix
    )
    forceMatrix = updateForceMatrix(
      forceMatrix,
      bodies,
      distanceMatrix,
      directionMatrix,
      G
    )
    updateAcceleration(bodies, forceMatrix)
    updateVelocities(bodies, stepSize)
    drawBodies(ctx, bodies)
  }
}
