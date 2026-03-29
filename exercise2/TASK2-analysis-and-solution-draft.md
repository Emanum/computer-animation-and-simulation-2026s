# Exercise 2 - Task 2 Analysis and Solution Draft (No Code)

## Checklist
- [x] Analyze Task 2 requirements from `exercise2/Readme.md`
- [x] Analyze relevant JavaScript code (`exercise2/js/kinematic-linkage.js`, `exercise2/js/main.js`, `exercise2/js/symbolic-matrix.js`)
- [x] Analyze relevance of MATLAB files (`exercise2/matlab_code/pointMass1D.m`, `exercise2/matlab_code/pointMass2D.m`, `exercise2/matlab_code/LCPSolve.m`)
- [x] Draft the mathematical process for Task 2 (Jacobian transpose IK) without writing code
- [x] Add supporting internet references for theory and implementation conventions

## 1) What the task asks (`exercise2/Readme.md`)

Task 2 asks for inverse kinematics via Jacobian transpose in `exercise2/js/kinematic-linkage.js`, specifically:
- `initJacobian(...)`
- `jacobianTransposeMethod(...)`

Expected behavior:
1. Build a symbolic end-effector position function from the FK chain.
2. Build its symbolic Jacobian with respect to all DOFs.
3. Iteratively update DOF values using Jacobian transpose gradient steps to move the end effector toward a target.

Scope: Task 2 is worth 3 points and must be explainable during presentation.

## 2) Existing JavaScript architecture and implications

## 2.1 Runtime flow (`exercise2/js/main.js`)

- `runInverseKinematics()` calls either Jacobian transpose (Task 2) or CCD (Task 3).
- For Jacobian transpose, parameters are user-controlled:
  - `iterations`
  - `alpha`
- Returned DOF values are passed to `forward(...)` to render the updated pose.

Implication: `jacobianTransposeMethod(...)` must return a complete updated DOF object and be stable over repeated calls.

## 2.2 Relevant fields and placeholders (`exercise2/js/kinematic-linkage.js`)

Task 2 depends on Task 1 outputs:
- `localCoordinateFrames` from `initCoordinateFrames(...)`.

Task 2 fields:
- `endEffectorPos`: symbolic 3x1 position function \(f(\theta)\).
- `jacobian`: symbolic 3xN Jacobian \(J(\theta)\).
- `dofNames`: list of variables \((\theta_1,\dots,\theta_N)\).

Current placeholders:
- `initJacobian()` currently sets zero matrices.
- `jacobianTransposeMethod(...)` only clones input and returns it.

## 2.3 Symbolic/matrix support (`exercise2/js/symbolic-matrix.js`)

Useful methods for Task 2:
- `SymbolicMatrix.computeJacobian(vectorValuedFunction, variableNames)`
- `SymbolicMatrix.getTranspose(a)`
- `evaluate(values, "mathjsMatrix")` for matrix math with math.js

Important: Jacobian transpose update needs general matrix multiplication (N x 3 times 3 x 1), so using math.js matrices is appropriate.

## 3) MATLAB code analysis and relevance

## 3.1 What MATLAB files cover

- `pointMass1D.m`, `pointMass2D.m`: implicit integration, contact, friction, iterative updates.
- `LCPSolve.m`: linear complementarity problem solver.

## 3.2 Relevance to Task 2

These files are not direct IK/Jacobian implementations. They are primarily dynamics/contact solvers.

Conceptual overlap:
- iterative correction of state variables,
- residual/error-driven updates,
- sensitivity to step size and convergence criteria.

That overlap supports explaining why Jacobian transpose IK needs careful choice of iteration count and step length \(\alpha\).

## 4) Task 2 mathematical draft (no code)

## 4.1 End-effector position function

Let \(\theta = (\theta_1,\dots,\theta_N)^T\) be the DOF vector.

From FK, the final frame transform is:
\[
{}^{W}T_N(\theta) =
\begin{bmatrix}
R(\theta) & p(\theta) \\
0 & 1
\end{bmatrix}
\]

The end-effector position function is the translation part:
\[
f(\theta)=p(\theta)=\begin{bmatrix}x(\theta)\\y(\theta)\\z(\theta)\end{bmatrix}
\in \mathbb{R}^{3}
\]

In this project, `endEffectorPos` is that symbolic 3x1 function.

## 4.2 Jacobian definition

The positional Jacobian is:
\[
J(\theta)=\frac{\partial f}{\partial \theta}
=
\begin{bmatrix}
\frac{\partial x}{\partial \theta_1} & \cdots & \frac{\partial x}{\partial \theta_N} \\
\frac{\partial y}{\partial \theta_1} & \cdots & \frac{\partial y}{\partial \theta_N} \\
\frac{\partial z}{\partial \theta_1} & \cdots & \frac{\partial z}{\partial \theta_N}
\end{bmatrix}
\in \mathbb{R}^{3\times N}
\]

In this project, compute it symbolically via `SymbolicMatrix.computeJacobian(endEffectorPos, dofNames)`.

## 4.3 Jacobian transpose update rule

Define target position \(e^*\in\mathbb{R}^3\), current position \(f(\theta_k)\), and error:
\[
e_k = e^* - f(\theta_k)
\]

Jacobian transpose descent step:
\[
\Delta\theta_k = \alpha J(\theta_k)^T e_k
\]
\[
\theta_{k+1}=\theta_k+\Delta\theta_k
\]

Repeat for `numIterations` iterations.

Interpretation:
- This is gradient descent on squared position error \(\frac{1}{2}\|e\|^2\).
- \(\alpha\) controls stability/speed.

## 5) Process draft for `initJacobian(...)`

1. Identify symbolic transform of the end-effector frame (last entry in `localCoordinateFrames`).
2. Extract the translation column (first 3 rows of column index 3) as a symbolic 3x1 matrix.
3. Store it in `endEffectorPos`.
4. Differentiate this 3x1 function wrt all variable names in `dofNames`.
5. Store the result in `jacobian`.

Expected dimensions:
- `endEffectorPos`: 3x1
- `jacobian`: 3xN

## 6) Process draft for `jacobianTransposeMethod(...)`

Given inputs (`dofValues`, `targetPos`, `numIterations`, `alpha`):

1. Convert `targetPos` to a 3x1 math.js column vector.
2. Clone input DOFs into a mutable output map (do not mutate UI-owned object directly).
3. For each iteration:
   - Evaluate `endEffectorPos` at current DOFs -> current 3x1 position.
   - Compute error \(e = e^* - f(\theta)\).
   - Evaluate `jacobian` at current DOFs -> 3xN matrix.
   - Transpose Jacobian -> N x 3.
   - Compute \(\Delta\theta = \alpha J^T e\) -> N x 1.
   - Add each \(\Delta\theta_i\) to corresponding DOF in output map.
4. Return updated DOF map.

Optional practical stop condition:
- If \(\|e\|\) falls below small threshold, terminate early.

## 7) Common pitfalls and how to avoid them

- Dimension mismatch:
  - Ensure `target`, `f(theta)`, and error are 3x1.
  - Ensure `J` is 3xN and `J^T` is N x 3.
- Wrong DOF ordering:
  - Always map vector entries in the exact order of `dofNames`.
- Too large `alpha`:
  - Causes oscillation/divergence. Start small and increase cautiously.
- Too few iterations:
  - May stop before meaningful convergence.
- Singular/near-singular configurations:
  - Jacobian transpose can stagnate; this is expected in some poses.

## 8) Why this is mathematically valid

Task 2 uses first-order local linearization:
\[
f(\theta+\Delta\theta) \approx f(\theta) + J(\theta)\Delta\theta
\]

Choosing \(\Delta\theta=\alpha J^T e\) moves parameters in a descent direction for position error energy. Repeated updates produce an iterative IK solver consistent with the lecture method.

## 9) Internet references used for theory and conventions

- THREE.js `Matrix4` docs: https://threejs.org/docs/#api/en/math/Matrix4
- math.js matrices and operations: https://mathjs.org/docs/datatypes/matrices.html
- Modern Robotics (Lynch and Park): http://modernrobotics.org
- Jacobian and Jacobian-transpose IK notes (intro resource): https://www.cs.cmu.edu/~15464-s13/lectures/lecture6/iksurvey.pdf
- J. J. Craig, *Introduction to Robotics: Mechanics and Control* (Jacobian-based IK chapters)

## 10) Short presentation-ready explanation

Task 2 is solved by first deriving a symbolic end-effector position function from the FK chain and then computing its symbolic Jacobian with respect to all joint variables. During runtime, the current Jacobian and end-effector position are evaluated numerically, the target-position error is computed, and DOFs are updated iteratively with \(\Delta\theta = \alpha J^T e\). This implements Jacobian-transpose inverse kinematics and integrates directly with the existing `main.js` update loop and `SymbolicMatrix` utilities.

