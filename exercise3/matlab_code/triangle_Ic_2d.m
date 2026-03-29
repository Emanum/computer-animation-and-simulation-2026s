syms u v real
a = sym('a_', [2 1], 'real');
b = sym('b_', [2 1], 'real');

p = u*a + v*b + (1-u-v)*0; % --> barycentric mapping, integrate on the reference triangle (which has area 1/2 !)

Ic =  simplify( int( int( dot(p,p), v, 0,1-u),  u, 0,1) );

simplify(  ( a'*a + a'*b + b'*b ) / 12 == Ic ) % note: to be multiplied by 2*area of original triangle!
