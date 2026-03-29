clear; clc;

p1 = [0 0 ; 0.2 0 ; 0.2 2 ; 0 2]';
p2 = [0 0 ; 0.4 0 ; 0.2 1 ]'; % .2 ; 0.5 1.4 ; -0.5 1.5

[c1,I1,m1] = computeCoMandI(p1, 1.0);
[c2,I2,m2] = computeCoMandI(p2, 1.5);


cr1 = [0.1; 0]; ap1 = [1.9; 4];
R = @(phi) [cos(phi) -sin(phi); sin(phi) cos(phi)];
T1 = @(q) [R(q(1)+pi) ap1+cr1-R(q(1)+pi)*cr1; 0 0 1];
cr2 = [0.2; 0]; ap2 = [-0.1; 2];
T2 = @(q) T1(q)*[R(q(2)) ap2+cr2-R(q(2))*cr2; 0 0 1];
q = [1; 1]; % parameters: rotation around anchor points

figure;
pt = T1(q)* [p1; ones(1,size(p1,2))];
plt = patch(pt(1,:), pt(2,:), [0 0 0.8]);
axis equal; axis([-1 5 -1 5]); hold on;

pt = T2(q)* [p2; ones(1,size(p2,2))];
plt2= patch(pt(1,:), pt(2,:), [0.6 0.6 0.7]);

% ap2_ = ap2(q); c1_=T1(q)*[c1;1]; c2_=T2(q)*[c2;1];
% plot(ap2_(1),ap2_(2),'ro'); plot(c1_(1),c1_(2),'gx'); plot(c2_(1),c2_(2),'go');

set(gca,'XTick', 0);
set(gca,'YTick', 0);

%%
% basic case: just one object
if  0
%%
    if exist('plt2'), delete(plt2); end
    % saveas(gcf, ['_img/abDemo1_' num2str(0,'%04d') '.png']);
    q = q(1); % initial configuration
    v = 0; % initial velocity of parameter
    
    % force at c.o.m.
    fc = [0; -9.81*m1; 0]; % [x, y, rot]
    
    % mass at c.o.m.
    M = [m1 0 0 ; 0 m1 0 ; 0 0 I1];
    
    
    syms phi 'real';
    J = matlabFunction(  [[1 0 0 ; 0 1 0] *diff( T1(phi), phi) * [c1; 1] ; 1]  ); % Jacobian of c.o.m. motion wrt. parameter
    dJ= matlabFunction(  diff(J, phi)  );
    
    h = 1/30;
    for step = 1:180
        % J(q)'*M*dJ(q) -- always zero here (first link, base not moving)
        fq = J(q)'*fc ;
        Mq = J(q)'*M*J(q);
    
        v = v + h*(Mq\fq);
        q = q + h*v;
    
        pt = T1(q)* [p1; ones(1,size(p1,2))];
        set(plt, 'XData', pt(1,:), 'YData', pt(2,:));
        ct = T1(q)* [c1; 1];
        plot(ct(1),ct(2), 'k.');
        drawnow; pause(h);
        % saveas(gcf, ['_img/abDemo1_' num2str(step,'%04d') '.png']);
    end
end
%%

% q = [1; -1]; % initial configuration
v = [0;  0]; % initial velocity of parameter

% force at c.o.m.s
fc = [0; -9.81*m1; 0; 0; -9.81*m2; 0]; % [x, y, rot] ...

% mass at c.o.m.s
M = diag([m1 m1 I1 m2 m2 I2]);


qs = sym('phi_', [2 1], 'real');
% Jacobian ...  position wrt. parameter         ... rotation
J1 = [[1 0 0 ; 0 1 0] *diff( T1(qs), qs(1)) * [c1; 1] ; 1] ; % Jacobian of c.o.m. motion wrt. parameter
J21 =[[1 0 0 ; 0 1 0] *diff( T2(qs), qs(1)) * [c2; 1] ; 1] ; % Jacobian of c.o.m. motion wrt. parameter
J2 = [[1 0 0 ; 0 1 0] *diff( T2(qs), qs(2)) * [c2; 1] ; 1] ; % Jacobian of c.o.m. motion wrt. parameter
Js = [J1 zeros(3,1) ; J21 J2];
J = matlabFunction( Js, 'Vars',{qs});
% Note: first column in J = effect of q(1) on both c.o.m. motions, second column = effect of q(2)

dq = sym('dq_', [2 1], 'real');
dJ=  matlabFunction(diff( Js, qs(1)) * dq(1) + diff( Js, qs(2)) * dq(2), 'Vars',{qs,dq});

%%
% saveas(gcf, ['_img/abDemo2_' num2str(0,'%04d') '.png']);
h = 1/60; % Note: large time steps with explicit integration can become unstable (energy increase!)
for step = 1:360
    fq = J(q)'*fc ;
    Mq = J(q)'*M*J(q);
    % E = -[T1(q)*[c1; 1];  T2(q)* [c2; 1]]'*fc  + 0.5*v'*Mq*v; % total energy: -m*g*h + mv^2/2
    % title(['E = ' num2str(E,'%.3f')]);

    % symplectic Euler: update velocity first, then position with new velocity --> much closer to stability
    v = v + h*(Mq\(fq - (J(q)'*M*dJ(q,v))*v)); % note: could add some damping to keep it stable
    q = q + h*v;

    % % Leapfrog / velocity Verlet
    % v = v + (h/2)*(Mq\(fq - (J(q)'*M*dJ(q,v))*v)); % half-step velocity update
    % q = q + h*v; % full-step position update
    % fq = J(q)'*fc ;
    % Mq = J(q)'*M*J(q);
    % v = v + (h/2)*(Mq\(fq - (J(q)'*M*dJ(q,v))*v)); % second half-step velocity update

    % % forward Euler: update both position and velocity based on start-of-timestep state --> strong energy gain (unstable) for large timesteps
    % dv = (Mq\(fq - (J(q)'*M*dJ(q,v))*v));
    % q = q + h*v;
    % v = v + h*dv;

    pt = T1(q)* [p1; ones(1,size(p1,2))];
    set(plt, 'XData', pt(1,:), 'YData', pt(2,:));

    pt = T2(q)* [p2; ones(1,size(p2,2))];
    set(plt2, 'XData', pt(1,:), 'YData', pt(2,:));

    ct = T1(q)* [c1; 1];
    plot(ct(1),ct(2), 'k.');
    ct = T2(q)* [c2; 1];
    plot(ct(1),ct(2), 'r.');
    drawnow; pause(h);
    % saveas(gcf, ['_img/abDemo2_' num2str(step,'%04d') '.png']);


end




%%

function [c,Ic,m] = computeCoMandI(p,density)
    c = [0;0]; m = 0;
    for l=1:size(p,2)
        nl = l+1; if l==size(p,2), nl=1; end
    
        % connect to origin to form triangle
        tri_area = 0.5 * ( (p(1,l)).*(p(2,nl))-(p(2,l))*(p(1,nl)) );
    
        % sum weighted centroids of triangles and areas (= mass at unit density)
        c = c + density*tri_area*(p(:,l)+p(:,nl))/3; % note third corner at [0;0]
        m = m + density*tri_area;
    end
    c = c./m;

    Ic = 0;
    for l=1:size(p,2)
        nl = l+1; if l==size(p,2), nl=1; end
        % connect each edge of the polygon to the centre of mass to form a triangle
        a = p(:,l)-c; b = p(:,nl)-c; % --> triangle (a,b,0)
        % integrate p^2 over this triangle --> bary. coords. p = u*a+v*b + (1-u-v)*0 --> integrate on reference triangle --> tri_area * ( a'*a + a'*b + b'*b ) / 24
        tri_area = 0.5*(a(1)*b(2)-a(2)*b(1));
        Ic = Ic + ( a'*a + a'*b + b'*b ) * density*(tri_area*2) / 12; % (tri_area*2) because we need A/A0 with A0=1/2 the reference triangle area
    end
end