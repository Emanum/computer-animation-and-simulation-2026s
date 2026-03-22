# EXERCISE 2- INVERSE KINEMATICS
**VU Computer Animation and Simulation, TU Wien, 2026S**

## 1 General

### 1.1 Setup
**12.03.2026**

Exercises 1 to 4 are web-based THREE.js applications. For developing and running, an editor and a local web server are required. We recommend using VSCode with the Live Preview extension. After installing the extension, simply open the exercise folder in VSCode, right click `index.html` and click “Show Preview”. If you prefer other editors or web servers, feel free to use them.

If you are unfamiliar with THREE.js, we recommend taking a look the Fundamentals chapter of their manual. If you want to brush up on modern JavaScript, the Prerequisites chapter is a good starting point.

### 1.2 Grading

You can reach a total of 8 points in this exercise. The maximum number of reachable points is indicated at each task. The grading will take place at the exercise presentation session towards the end of the semester (see TUWEL for the date and location). During this session, you will be asked to present a (sub-)task of this exercise to the class. After successfully presenting and explaining the code, you will receive the points. In case you fail to explain the code, you will not receive the points for this exercise sheet.

### 1.3 Submission Instructions

In the TUWEL submission, upload a ZIP file containing:

- A short video of your program, showcasing the tasks you implemented. This should be no longer than ∼ 60 seconds, similar to the video shown along the task description in TUWEL.
- Your source code including the `js` directory with all source files, the `index.html` and `main.css` files.
- A txt file listing all the (sub-)tasks you have implemented and the corresponding points you expect you receive (this will be the basis for your grade in the exercise presentation).

---

*Inverse Kinematics*

Page 1 / 2

## 2 Tasks

Tasks 1-3 in this exercise are to be solved in the file `kinematic-linkage.js`. The corresponding sections in the code are marked at their beginning and end with comments (e.g., `//TASK1- begin` and `//TASK1- end`). In the JavaScript file, you can also find some more detailed instructions for the implementation. The video on TUWEL demonstrates the expected functionality.

In this exercise, we will be using **math.js** for symbolic computation. This allows us to compute the derivative of an expression symbolically, which we use to get the Jacobian for Task 2. Since math.js only works for scalar expressions, we provide a class `SymbolicMatrix` (file `symbolic-matrix.js`) that implements symbolic matrix multiplication among a few other things. Please take a look at its (in-code) documentation for more details.

Technically, you only need modifications in `kinematic-linkage.js` to solve this exercise. However, you are free to modify any other code as needed for your particular solution.

### 2.1 Task 1: Forward Kinematics (1 Point)

Implement forward kinematics given a set of transformations and DOF values. See methods `initCoordinateFrames(...)` and `forward(...)`.

### 2.2 Task 2: Inverse Kinematics using Jacobian transpose (3 Point)

Implement the Jacobian transpose method for inverse kinematics. See methods `initJacobian` and `jacobianTransposeMethod`.

### 2.3 Task 3: Inverse Kinematics using CCD (4 Points)

Implement Cyclic Coordinate Descent (CCD) for Inverse kinematics. CCD is an iterative approach in which each joint is updated one at a time toward an optimum (the minimal distance to the end-effector goal position). Chapter 4 of this article explains the general idea of the algorithm, while Figure 3 illustrates the procedure nicely. While the article considers arbitrary (potentially more optimal) joint iteration orders, in this example, we consider only the tip-to-base joint iteration order.

For this task, we assume each joint is a revolute joint with exactly one degree of freedom, where the rotation axis is either the local X, Y, or Z axis. This assumption allows us to project the directions to the effector and the goal position onto the plane perpendicular to the joint’s rotation axis, thereby solving the problem in 2D (as illustrated in the article).

There are other approaches as well, and you are free to choose a different one. However, ensure your implementation constrains the rotation to the specified degrees of freedom.

Implement your solution in the method `cyclicCoordinateDescentMethod`.

---

*Inverse Kinematics*

Page 2 / 2