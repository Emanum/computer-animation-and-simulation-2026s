import * as THREE from "three";
import * as math from "mathjs";

/**
 * Represents a matrix, where the entries are mathematical expressions (which can contain variables and functions like sin/cos).
 * Entries are kept as strings and internally, math.js (https://mathjs.org/) is used to evaluate them.
 * 
 * You can create a symbolic matrix using the constructor ({@link SymbolicMatrix.constructor}) and specifying
 * all entries as expressions directly.
 * 
 * Alternatively, you can use the factory methods
 *  - to create zero-filled matrices {@link SymbolicMatrix.createZeros},
 *  - identity matrices {@link SymbolicMatrix.createIdentity},
 *  - or rotation matrices ({@link SymbolicMatrix.createRotationX}, {@link SymbolicMatrix.createRotationY}, {@link SymbolicMatrix.createRotationZ}).
 * 
 * You can get or set entries of the matrix using {@link SymbolicMatrix.get} and {@link SymbolicMatrix.set}.
 * 
 * Symbolic computations supported are matrix multiplication ({@link SymbolicMatrix.multiplyMatrices}),
 * getting the transpose ({@link SymbolicMatrix.getTranspose}) and computing the Jacobian ({@link SymbolicMatrix.computeJacobian}).
 * There operations are performed symbolically, meaning they returns a new symbolic matrix, potentially still containing variables in its expression.
 * 
 * A symbolic matrix can be evaluated using ({@link SymbolicMatrix.evaluate}), substituting values for the variables passed.
 * 
 * @example
 * // creation
 * const a = new SymbolicMatrix([["a", "cos(b)"],
 *                               ["c", "1"     ]]);
 * const b = new SymbolicMatrix([["1", "2"],
 *                               ["3", "4"]]);
 * const rotX = SymbolicMatrix.createRotationX("theta");
 * const eye = SymbolicMatrix.createIdentity(3, 2); // (3x2 matrix, 1s in diagonal, 0s elsewhere)
 * 
 * // multiplication
 * const c = SymbolicMatrix.multiplyMatrices(a, b);
 * // returns new symbolic matrix with [["a + 3*cos(b)", "2*a + 4*cos(b)"],
 * //                                   ["c + 3*1",      "2*c + 4"       ]]
 * 
 * // evaluation
 * const result1 = c.evaluate({a: 1, b: 0, c: 2}); // returns [[4, 6], [5, 8]]
 * const result2 = c.evaluate({a: 1, b: 0, c: 2}, "mathjsMatrix"); // same, but as math.js matrix object
 */
export class SymbolicMatrix {

    /** @type{string[][]} */
    expressions = undefined;

    numRows = 0;

    numCols = 0;

    /**
     * Creates a new Symbolic matrix with entries specified.
     * 
     * @param {string[][]} entries expressions to put as entries of the matrix.
     */
    constructor(entries) {
        if (entries.length < 1 || entries[0].length < 1) {
            throw new Error("Matrix must have at least one element");
        }

        this.numRows = entries.length;
        this.numCols = entries[0].length;

        entries
            .filter(expressionRow => expressionRow.length !== this.numCols)
            .forEach(() => { throw new Error("All rows must have same size"); });

        this.expressions = entries;
    }

    /**
     * Gets entry of matrix.
     * 
     * @param {number} rowIndex index of row
     * @param {number} colIndex index of column
     * @returns {string} expression at given indices
     */
    get(rowIndex, colIndex) {
        return this.expressions[rowIndex][colIndex];
    }

    /**
     * Sets entry in matrix.
     * 
     * @param {number} rowIndex index of row
     * @param {number} colIndex index of column
     * @param {string} expression to set as entry at indices
     */
    set(rowIndex, colIndex, expression) {
        this.expressions[rowIndex][colIndex] = expression.toString();
    }

    /**
     * Returns the row at index rowIndex.
     * 
     * @param {number} rowIndex index of row to return, starting at 0
     * @returns {string[]} entries (expressions) in row with index rowIndex
     */
    getRow(rowIndex) {
        return this.expressions[rowIndex];
    }

    /**
     * Returns the column at index colIndex.
     * 
     * @param {number} colIndex index of column to return, starting at 0
     * @returns {string[]} entries (expressions) in column with index colIndex
     */
    getCol(colIndex) {
        return this.expressions.map(row => row[colIndex]);
    }

    /**
     * Substitutes values into all entries (expressions) of this matrix and evaluates the expressions.
     * 
     * The return type depends on the parameter "type".
     * This must be either of values
     * - "array2d" returns values as 2-dimensional number array, where the first index is row and the second is column
     * - "arrayFlat" returns values as 1-d number array, row-major order
     * - "mathjsMatrix" returns values as a math.js matrix object (see https://mathjs.org/docs/datatypes/matrices.html)
     * - "threeMatrix4" returns values as a THREE.Matrix4 object (see https://threejs.org/docs/#Matrix4)
     * 
     * @param {Object.<string, number>} values object that maps variable names to values that should be substituted.
     * @param {string} type format in which the evaluated matrix should be returned
     * @returns {number[][] | number[] | math.matrix | THREE.Matrix4} results of evaluation, type depends on type parameter (see above)
     */
    evaluate(values, type = "array2d") {
        /*return this.expressions
            .map(row => { return row.map(expression => math.evaluate(expression, values)); })
            .reduce((accumulator, row) => accumulator.concat(row), []);*/
        const result = this.expressions
            .map(row => { return row.map(expression => math.evaluate(expression, values)); });

        if (type === "array2d") {
            return result;
        } else if (type === "arrayFlat") {
            return result.reduce((accumulator, row) => accumulator.concat(row), []);
        } else if (type === "mathjsMatrix") {
            return math.matrix(result);
        } else if (type === "threeMatrix4") {
            return new THREE.Matrix4(...(result.reduce((accumulator, row) => accumulator.concat(row), [])));
        }
        throw new Error("unknown return type for evaluate");
    }

    /**
     * Returns this matrix as an array.
     * 
     * @returns {string[]} array with entries of this matrix in row-major order
     */
    getAsFlatArray() {
        return this.expressions.reduce((acc, value) => acc.concat(value), []);
    }

    /**
     * Returns a string representation of this symbolic matrix.
     * @returns {string} representation
     */
    toString() {
        const maxStringLength = Math.max(...this.getAsFlatArray().map(expression => expression.length));
        return this.expressions
            .map(row => {
                return row
                    .map(entry => `${entry.padStart(maxStringLength, " ")}`)
                    .join(", ");
            })
            .join("\n");
    }

    /**
     * Computes transpose of matrix.
     * 
     * @param {SymbolicMatrix} a matrix
     * @returns {SymbolicMatrix} transpose of a
     */
    static getTranspose(a) {
        const transpose = SymbolicMatrix.createZeros(a.numCols, a.numRows);
        for (let rowIndex = 0; rowIndex < a.numRows; rowIndex++) {
            for (let colIndex = 0; colIndex < a.numCols; colIndex++) {
                transpose.set(colIndex, rowIndex, a.get(rowIndex, colIndex));
            }
        }
        return transpose;
    }

    /**
     * Computes matrix product of two matrices.
     * 
     * @param {SymbolicMatrix} a 
     * @param {SymbolicMatrix} b 
     * @returns {SymbolicMatrix} matrix product
     */
    static multiplyMatrices(a, b) {
        if (a.numCols !== b.numRows) {
            throw new Error(`Cannot multiply matrices with dimensions (${a.numRows}x${a.numCols}) and (${b.numRows}x${b.numCols})`);
        }

        // TODO maybe use math.parse and keep as math.Node objects instead of always doing string parsing
        const result = SymbolicMatrix.createZeros(a.numRows, b.numCols);
        for (let rowIndex = 0; rowIndex < result.numRows; rowIndex++) {
            for (let colIndex = 0; colIndex < result.numCols; colIndex++) {
                const row = a.getRow(rowIndex);
                const col = b.getCol(colIndex);
                const cellResult = row
                    .map((_, i) => `((${row[i]}) * (${col[i]}))`)
                    .join("+");
                const simplified = math.simplify(cellResult).toString();
                result.set(rowIndex, colIndex, simplified);
            }
        }
        return result;
    }

    /**
     * Computes the Jacobian of a vector-valued function (represented as a column vector of type SymbolicMatrix).
     * 
     * Let f_i(x) = (f_1(x), f_2(x), f_3(x), ...).T be a vector-valued function in variables x = (x_1, x_2, ...).T.
     * 
     * Then the Jacobian J(x) of f(x) is the matrix
     * 
     *          J(x) = (d/dx_1 f_1(x)    d/dx_2 f_1(x)    d/dx_3 f_1(x)    ...)
     *                 (d/dx_1 f_2(x)    d/dx_2 f_2(x)    d/dx_3 f_2(x)    ...)
     *                 (d/dx_1 f_3(x)    d/dx_2 f_3(x)    d/dx_3 f_3(x)    ...)
     *                 (...              ...              ...              ...)
     * 
     * @param {SymbolicMatrix} vectorValuedFunction a (symbolic) column vector, where each entry is a some function of names
     * @param {string[]} variableNames an array of variable names, that are the parameters of vectorValuedFunction
     *                                 (i.e. that are used in the expressions comprising vectorValuedFunction)
     * @returns {SymbolicMatrix} Jacobian with numRows is vectorValuedFunction.numRows and numCols is variableNames.length
     */
    static computeJacobian(vectorValuedFunction, variableNames) {
        let jacobian = SymbolicMatrix.createZeros(vectorValuedFunction.numRows, variableNames.length);

        for (let rowIndex = 0; rowIndex < vectorValuedFunction.numRows; rowIndex++) {
            for (let nameIndex = 0; nameIndex < variableNames.length; nameIndex++) {
                const derivative = math.derivative(vectorValuedFunction.get(rowIndex, 0), variableNames[nameIndex]);
                jacobian.set(rowIndex, nameIndex, derivative.toString());
            }
        }

        return jacobian;
    }

    /**
     * Creates a rotation around the X axis where the angle is a variable.
     * The name of the angle is passed.
     * 
     * @param {*} name the name for the variable used as angle
     * @returns {SymbolicMatrix} the rotation matrix
     */
    static createRotationX(name) {
        return new SymbolicMatrix([
            ["1", "0", "0", "0"],
            ["0", `cos(${name})`, `-sin(${name})`, "0"],
            ["0", `sin(${name})`, `cos(${name})`, "0"],
            ["0", "0", "0", "1"],
        ]);
    }

    /**
     * Creates a rotation around the Y axis where the angle is a variable.
     * The name of the angle is passed.
     * 
     * @param {*} name the name for the variable used as angle
     * @returns {SymbolicMatrix} the rotation matrix
     */
    static createRotationY(name) {
        return new SymbolicMatrix([
            [`cos(${name})`, "0", `sin(${name})`, "0"],
            ["0", "1", "0", "0"],
            [`-sin(${name})`, "0", `cos(${name})`, "0"],
            ["0", "0", "0", "1"],
        ]);
    }

    /**
     * Creates a rotation around the Z axis where the angle is a variable.
     * The name of the angle is passed.
     * 
     * @param {*} name the name for the variable used as angle
     * @returns {SymbolicMatrix} the rotation matrix
     */
    static createRotationZ(name) {
        return new SymbolicMatrix([
            [`cos(${name})`, `-sin(${name})`, "0", "0"],
            [`sin(${name})`, `cos(${name})`, "0", "0"],
            ["0", "0", "1", "0"],
            ["0", "0", "0", "1"],
        ]);
    }

    /**
     * Creates a symbolic matrix containing only zeros.
     * 
     * @param {number} numRows number of rows
     * @param {number} numCols number of columns
     * @returns {SymbolicMatrix}
     */
    static createZeros(numRows, numCols) {
        return new SymbolicMatrix(
            new Array(numRows).fill(undefined).map(() => new Array(numCols).fill("0"))
        );
    }

    /**
     * Creates a symbolic matrix containing ones in the diagonal and zeros everywhere else.
     * 
     * Similar to `eye` in common frameworks, like numpy, e.g. https://numpy.org/doc/stable/reference/generated/numpy.eye.html
     * 
     * @param {number} numRows number of rows
     * @param {number} numCols number of columns
     * @returns {SymbolicMatrix}
     */
    static createIdentity(numRows, numCols) {
        const result = SymbolicMatrix.createZeros(numRows, numCols);
        const minDimension = Math.min(numRows, numCols);
        for (let i = 0; i < minDimension; i++) {
            result.set(i, i, "1");
        }
        return result;
    }

}
