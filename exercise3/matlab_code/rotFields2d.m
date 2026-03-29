clear; clc;

syms t 'real';
syms x(t) y(t) phi(t);
c = sym('c_',[2 1],'real');
p0 = sym('p0_',[2 1],'real');

tv = [x; y];

R = [cos(phi) -sin(phi); sin(phi) cos(phi)];
T = [R tv+c-R*c; 0 0 1];


p = [1 0 0; 0 1 0]  *  T*[p0; 1];

% simplify( jacobian( p, t ) )
% diff(R, t) - [0 -diff(phi,t); diff(phi,t) 0]*R

% material-space velocity
vm = [0 -1; 1 0]*diff(phi,t)*R*(p0-c)+diff(tv,t);
simplify( jacobian( p, t ) == vm ) % equal 

% p = R*p0 + tv+c-R*c = R*(p0-c)+tv+c
% --> R*(p0-c) = p-tv-c
vm_ = [0 -1; 1 0]*diff(phi,t)*(p-tv-c)+diff(tv,t);
simplify( vm_==vm ) % equal

% define in world space:
pw = sym('pw_',[2 1],'real');
vw = [0 -1; 1 0]*diff(phi,t)*(pw-tv-c)+diff(tv,t);
syms w 'real';
v = sym('v_',[2 1],'real');

vw = simplify( subs(subs( vw, diff(tv,t), v), diff(phi,t), w) )
w_ = [0 -w; w 0]; % skew-sym form of cross product
vw_= w_*(pw-tv-c)+v; 
simplify( vw_ == vw ) % equal

%%
% assume material-space centered at c=0, then
p = subs(p, c, [0;0]); % = R*p0 + tv
vm = subs(vm, c, [0;0])
% therfore p = R*p0 + tv --> R*p0 = p - tv
vm_ = simplify( [0 -1; 1 0]*diff(phi,t)*(p-tv)+diff(tv,t) );
simplify( vm == vm_ ) % equal

pw = sym('pw_',[2 1],'real');
vw = simplify( [0 -1; 1 0]*diff(phi,t)*(pw-tv)+diff(tv,t) );
syms w 'real';
v = sym('v_',[2 1],'real');
vw = simplify( subs(subs( vw, diff(tv,t), v), diff(phi,t), w) )


w_ = [0 -w; w 0]; % skew-sym form of cross product
vw_  = w_*(pw-tv)+v; 
simplify( vw == vw_ ) % equal

trace( jacobian( v, p0) ) % == divergence
