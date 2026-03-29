# Exercise 2 - Task 1 Analysis and Solution Draft (No Code)

## Checklist
- [x] Analyze task requirements from `exercise2/Readme.md`
- [x] Analyze existing JavaScript code (`exercise2/js/main.js`, `exercise2/js/kinematic-linkage.js`, `exercise2/js/symbolic-matrix.js`)
- [x] Analyze MATLAB code (`exercise2/matlab_code/pointMass1D.m`, `exercise2/matlab_code/pointMass2D.m`, `exercise2/matlab_code/LCPSolve.m`)
- [x] Draft a mathematical process for solving Task 1 (Forward Kinematics) without writing code
- [x] Add supporting information from standard internet references

## 1) What the task asks (`exercise2/Readme.md`)

Task 1 requires implementing forward kinematics in `exercise2/js/kinematic-linkage.js`, specifically in:
- `initCoordinateFrames(...)`
- `forward(...)`

Expected behavior:
1. Build symbolic coordinate frame transforms for all joints from the base frame and joint transformations.
2. For a given set of DOF values, evaluate these symbolic transforms numerically and apply them to the scene objects.

Scope note from README: Task 1 is only 1 point and focuses on FK basics. IK methods belong to Task 2 and Task 3.

## 2) Existing JavaScript architecture and implications

## 2.1 Scene and chain setup (`exercise2/js/main.js`)

The chain is assembled as a serial linkage:
- Base frame initialized with identity (`SymbolicMatrix.createIdentity(4,4)`).
- Each joint uses one symbolic rotation variable (`theta1` ... `theta6`).
- Some joint transforms include fixed translation (`set(1,3,3)`), representing link length offset.
- `addLink(transformation, dofName, rotationAxis, object)` stores:
  - symbolic transform,
  - DOF name,
  - axis label,
  - visual object attached to that frame.

After setup:
- `init()` is called to precompute symbolic structures.
- `forward(dofValues)` is called to display a pose.

Implication for Task 1: FK must produce frame matrices that correctly move the corresponding `coordinateFrameObjects` so the rendered linkage matches DOF values.

## 2.2 FK placeholders in `exercise2/js/kinematic-linkage.js`

Task 1 placeholder methods:
- `initCoordinateFrames()` currently only stores `[this.oxyz_0]`.
- `forward(degreesOfFreedom)` is empty.

Key stored fields relevant to FK:
- `this.oxyz_0`: symbolic base transform.
- `this.transformations`: symbolic per-joint transforms.
- `this.localCoordinateFrames`: should contain symbolic frame transforms along chain.
- `this.coordinateFrameObjects`: 3D objects whose matrices must be updated in `forward`.

Constructor detail:
- `rootObject.matrixAutoUpdate = false`.
- `rootObject.matrix` is set from `oxyz_0`.

This means FK must respect matrix assignment directly (no automatic TRS updates).

## 2.3 Symbolic support (`exercise2/js/symbolic-matrix.js`)

Directly useful for Task 1:
- `SymbolicMatrix.multiplyMatrices(a,b)`: symbolic matrix product.
- `evaluate(values, "arrayFlat")`: numeric evaluation with DOF substitutions.

Not needed for Task 1 but relevant later:
- `computeJacobian(...)` for Task 2.

Implication: Task 1 should be split into
1) symbolic precomputation, then
2) numeric evaluation per update.

## 3) MATLAB code analysis and relevance

## 3.1 What MATLAB files do

- `pointMass1D.m`: implicit integration (BDF1/BDF2), floor contact with penalty and QP/impact variants.
- `pointMass2D.m`: 2D contact + friction with both LCP and penalty-BDF approaches.
- `LCPSolve.m`: generic linear complementarity problem solver.

## 3.2 Relevance to Task 1

These files are **not direct FK implementations**. They mainly cover dynamics/contact numerics.

Still, there is a conceptual parallel useful for explanation:
- predefine model equations/structure,
- repeatedly evaluate numerically for state updates.

That mirrors Task 1's FK workflow:
- precompute symbolic transform chain once,
- evaluate for current DOF values whenever pose updates.

## 4) Task 1 solution draft (process only, no code)

## 4.1 Mathematical model

For a serial chain with base frame and joint transforms:

- Base/world transform:
  \[
  {}^{W}T_0 = \text{oxyz\_0}
  \]

- Joint transform from frame \(i-1\) to \(i\):
  \[
  {}^{i-1}T_i(\theta_i)
  \]

- Recursive FK composition:
  \[
  {}^{W}T_i(\theta) = {}^{W}T_{i-1}(\theta)\,{}^{i-1}T_i(\theta_i)
  \]

Each \({}^{W}T_i\) is a homogeneous \(4\times4\) matrix.

## 4.2 Phase A: `initCoordinateFrames(...)` (symbolic precomputation)

Process:
1. Start a list of symbolic frames with the base frame \({}^{W}T_0\).
2. Iterate through `transformations` in chain order.
3. For each joint, compute next frame by symbolic multiplication of previous world frame and current joint transform.
4. Store all resulting symbolic frames in `localCoordinateFrames`.

Result:
- `localCoordinateFrames[i]` becomes a symbolic expression matrix for frame \(i\), containing terms like `sin(theta_k)` and `cos(theta_k)`.

## 4.3 Phase B: `forward(degreesOfFreedom)` (numeric pose update)

Given a DOF map (e.g., `{theta1: v1, ..., theta6: v6}`):

1. For each symbolic frame in `localCoordinateFrames`, substitute DOF values and evaluate to numeric \(4\times4\).
2. Assign each evaluated matrix to the corresponding object in `coordinateFrameObjects`.
3. Because `matrixAutoUpdate` is disabled, matrix assignment is the essential update mechanism.

Expected effect:
- Axis helpers and attached link meshes move to the correct FK pose.

## 4.4 Correct indexing and mapping

A reliable mapping is required:
- symbolic frame index \(i\) <-> visual frame object index \(i\)

If indexing is shifted, links will appear detached/offset even if math is correct.

## 4.5 Important convention caveat (THREE.js)

`THREE.Matrix4` uses column-major internal storage; `Matrix4.set(...)` accepts elements in row-major argument order according to docs, then stores internally in column-major format. Keep one consistent convention when feeding flattened arrays.

Also, `rootObject.matrix` already applies base transform. Ensure frame transforms assigned to child objects are consistent with that hierarchy (avoid unintentionally applying the base twice).

## 5) Why this process is mathematically correct

Forward kinematics for a serial manipulator is exactly chained homogeneous transform multiplication. Since each joint transform is symbolic in one DOF, precomputation yields closed-form frame expressions, and numerical substitution yields poses for any DOF state.

This is equivalent to standard robotics FK formulations and is the correct foundation for Task 2 (Jacobian-based IK) and Task 3 (CCD IK).

## 6) Internet references used for theory and conventions

- THREE.js Matrix4 documentation: https://threejs.org/docs/#api/en/math/Matrix4
- Modern Robotics (Lynch and Park): http://modernrobotics.org
- Kevin M. Lynch, Frank C. Park, *Modern Robotics: Mechanics, Planning, and Control* (FK chapters on rigid transforms and product of exponentials)
- John J. Craig, *Introduction to Robotics: Mechanics and Control* (homogeneous transforms and serial manipulators)

## 7) Short presentation-ready explanation

Task 1 is solved by splitting FK into two stages: (1) symbolic chain construction and (2) numeric evaluation for the current DOFs. Symbolic matrices are multiplied once to obtain each world-frame expression, then each frame is evaluated with current joint angles and written into the matching THREE.js object matrix. This is standard serial-chain FK using homogeneous transforms and is consistent with the existing `SymbolicMatrix` utilities and the linkage setup in `main.js`.

