EXERCISE 3- DEFORMATIONS
VU Computer Animation and Simulation, TU Wien, 2026S
1 General
1.1 Setup
26.03.2026
Exercises 1 to 4 are web-based THREE.js applications. For developing and running, an editor and a
local web server are required. We recommend using VSCode with the Live Preview extension. After
installing the extension, simply open the exercise folder in VSCode, right click index.html and click
“Show Preview”. If you prefer other editors or web servers, feel free to use them.
If you are unfamiliar with THREE.js, we recommend taking a look the Fundamentals chapter of their
manual. If you want to brush up on modern JavaScript, the Prerequisites chapter is a good starting
point.
1.2 Grading
You can reach a total of 8 points in this exercise. The maximum number of reachable points is
indicated at each task. The grading will take place at the exercise presentation session towards the
end of the semester (see TUWEL for the date and location). During this session, you will be asked
to present a (sub-)task of this exercise to the class. After successfully presenting and explaining the
code, you will receive the points. In case you fail to explain the code, you will not receive the points
for this exercise sheet.
1.3 Submission Instructions
In the TUWEL submission, upload a ZIP file containing:
• A short video of your program, showcasing the tasks you implemented. This should be no
longer than ∼ 60 seconds, similar to the video shown along the task description in TUWEL.
• Your source code including the js directory with all source files, the index.html and main.css
f
iles.
• A txt file listing all the (sub-)tasks you have implemented and the corresponding points you
expect you receive (this will be the basis for your grade in the exercise presentation).
Deformations
Page 1 / 3
2 Tasks
Tasks 1-3 in this exercise are to be solved in the file shaders/vertex.glsl. The corresponding
sections in the code are marked at their beginning and end with comments (e.g., //TASK1- begin
and //TASK1- end). Relevant math can be found in Chapter 4 of the book. The video on TUWEL
demonstrates the functionality expected from your implementation.
2.1 Task 1: Taper Deformation (1 Point)
Taper an object as described in the book using a GLSL shader.
The book uses a left-hand coordinate system, whereas OpenGL defaults to a right handed one. The
parameter k is not included in the book for this deformation. At k = 1.0 the tapering should be as
described in the book. At k = 0.0 the object should be in its original state.
2.2 Task 2: Twist Deformation (1 Point)
Twist an object as described in the book using a GLSL shader.
The TUWELexample multiplies the inner terms of sin and cos with 2π to emphasize the deformation.
2.3 Task 3: Bend Deformation (1 Points)
Bend an object as described in the book using a GLSL shader.
In Figure 4.18 in the book y′ and z′ show z < zmax in the first row, this should be z < zmin.
2.4 Task 4: Free Form Deformation (FFD) (3 Points)
Implement a linear FFD. The trivariate Bezier interpolation is not necessary. Task 4 is to be solved in
the file shaders/vertex
ffd.glsl.
The principle of FFD is that you have a set of control points. Each vertex inside the volume formed
by the control points is changed by the position of the control points. The first step is to register each
vertex with each control point. The dependency lies in [0, 1], the sum of all dependencies for each
vertex is 1. For extreme cases, a vertex coinciding with the control point will only be influenced by
this control point, while a vertex exactly in the middle will be equally dependent on all control points.
After Algorithm 1, dep now holds the dependency of the vertex in regards to the control point. Multi
plying the dependency factors with every control point will reconstruct the original vector. Multiplying
the dependency factors with modified control points will produce the modified vertex. You do not need
to optimize this, recalculate the dependency each time you process a vertex. This transform will only
work if the FFD volume is convex and produce errors when it is not (this will happen, it is ok).
Deformations
Page 2 / 3
Algorithm 1 Compute dependencies for FFD control points
for each vertex v in vertices do
for each control point c in control points do
for each component k ∈ {x,y,z} do
Calculate distance from v to c along component k
Map the distance to [0,1] dependency (variable dep)
// The cube has a side length of 2
// dep = 1 means v lies on c
// dep = 0 means v lies on opposite side
end for
Multiply the three dependencies for x,y,z
end for
end for
2.5 Task 5: Custom Global Deformation (2 Points)
Implement a global deformation (as in tasks 1 to 3) of your choice (it cannot be twist, taper or bend).
For this task you will need to make changes to main.js as well as shaders/vertex.glsl.
Deformations
Page 3 / 3