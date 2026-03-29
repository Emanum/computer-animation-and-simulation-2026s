# Exercise 2 - Task 2 Math Background (Short)

## Goal
This note gives the minimum math you need to implement Jacobian-transpose IK in `exercise2/js/kinematic-linkage.js`.

## 1) Notation
- Joint angles / DOFs: \(\theta = [\theta_1, \dots, \theta_N]^T\)
- End-effector position function: \(f(\theta) \in \mathbb{R}^3\)
- Target position: \(e^* \in \mathbb{R}^3\)
- Position error: \(e = e^* - f(\theta)\)
- Jacobian: \(J(\theta) = \frac{\partial f}{\partial \theta} \in \mathbb{R}^{3 \times N}\)

## 2) Forward kinematics idea (only what you need)
You already build the chain of transforms in Task 1:
\[
{}^{W}T_i = {}^{W}T_{i-1} \cdot {}^{i-1}T_i
\]
The end-effector position is the translation part of the last transform:
\[
f(\theta) = \begin{bmatrix}x(\theta) \\ y(\theta) \\ z(\theta)\end{bmatrix}
\]

In code terms:
- get the last frame from `localCoordinateFrames`
- extract entries `(0,3), (1,3), (2,3)` into a 3x1 symbolic vector
- store this in `endEffectorPos`

## 3) Jacobian for Task 2
Jacobian contains all partial derivatives of end-effector position wrt joint variables:
\[
J(\theta) =
\begin{bmatrix}
\frac{\partial x}{\partial \theta_1} & \cdots & \frac{\partial x}{\partial \theta_N} \\
\frac{\partial y}{\partial \theta_1} & \cdots & \frac{\partial y}{\partial \theta_N} \\
\frac{\partial z}{\partial \theta_1} & \cdots & \frac{\partial z}{\partial \theta_N}
\end{bmatrix}
\]

In code terms:
- compute once symbolically in `initJacobian()` using `SymbolicMatrix.computeJacobian(endEffectorPos, dofNames)`
- store in `jacobian`

## 4) Jacobian transpose update rule
At each iteration \(k\):
\[
e_k = e^* - f(\theta_k)
\]
\[
\Delta\theta_k = \alpha \; J(\theta_k)^T e_k
\]
\[
\theta_{k+1} = \theta_k + \Delta\theta_k
\]

That is exactly what `jacobianTransposeMethod(...)` should do repeatedly.

## 5) Dimensions checklist (important)
- `f(theta)`: 3x1
- `e`: 3x1
- `J`: 3xN
- `J^T`: Nx3
- `Delta theta`: Nx1

If these shapes match, your matrix multiplications are usually correct.

## 6) Practical tuning (short)
- Start with small `alpha` (e.g. `0.001` to `0.01`), then tune.
- More iterations improve reach but cost performance.
- Keep DOF order exactly equal to `dofNames` when converting between vector and object map.

## 7) How to render formulas so you can present them

## Option A (simple): GitHub / Markdown viewers with math support
Use LaTeX blocks already in this file (`\[ ... \]` / `\( ... \)`).

## Option B (reliable export): Pandoc + MathJax to HTML
If your local preview does not render math, export to HTML:

```powershell
cd "F:\dev\studium\computer-animation-and-simulation-2026s\exercise2"
pandoc ".\TASK2-math-background.md" -s -o ".\TASK2-math-background.html" --mathjax
```

Then open `TASK2-math-background.html` in a browser.

## Option C (PDF with formulas): Pandoc to PDF (if LaTeX installed)
```powershell
cd "F:\dev\studium\computer-animation-and-simulation-2026s\exercise2"
pandoc ".\TASK2-math-background.md" -o ".\TASK2-math-background.pdf"
```

## 8) Minimal implementation map
- `initJacobian()`:
  1. build symbolic `endEffectorPos`
  2. build symbolic `jacobian`
- `jacobianTransposeMethod(...)`:
  1. iterate
  2. evaluate `f(theta)` and `J(theta)`
  3. compute `Delta theta = alpha * J^T * e`
  4. update DOFs

That is the full mathematical core for Task 2.

