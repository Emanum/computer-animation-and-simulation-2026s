clear; clc;
R = @(phi) [cos(phi) -sin(phi); sin(phi) cos(phi)];

p=[
    44.8, 28.5
    53.2, 30.1
    56, 37.9
    60.8, 44.7
    66.4, 43.1
    71.4, 48.1
    69.2, 53.5
    59, 58.9
    49.8, 56.7
    44, 49.9
    45.8, 43.1
    41.2, 38.5
    34, 37.5
    32.2, 32.7
    39.6, 29.7
]'*0.05;

% p = [0 0 ; 2 0 ; 2 2 ; 0 2]';

%%
% basic rotation

pr = R(-10/180*pi) * p;
patch(pr(1,:), pr(2,:), [0 0 0.8]);
axis equal; axis([-1 5 -1 5]);


pr = R(20/180*pi) * p;
hold on; patch(pr(1,:), pr(2,:), [0.4 0.4 0.7]);

pr = R(50/180*pi) * p;
patch(pr(1,:), pr(2,:), [0.6 0.6 0.7]);

plot(0,0,'ro');
set(gca,'XTick', 0);
set(gca,'YTick', 0);

%%
% compute centre of mass (assume unit density)

c = [0;0]; area = 0;
for l=1:size(p,2)
    nl = l+1; if l==size(p,2), nl=1; end

    % connect to origin to form triangle
    tri_area = 0.5 * ( (p(1,l)).*(p(2,nl))-(p(2,l))*(p(1,nl)) );

    % sum weighted centroids of triangles and areas (= mass at unit density)
    c = c + tri_area*(p(:,l)+p(:,nl))/3; % note third corner at [0;0]
    area = area + tri_area;
end
c = c./area;
m =    area; % for unit density, mass equals area

figure;
patch(p(1,:), p(2,:), [0 0 0.8]); hold on;
plot(c(1),c(2),'gx','MarkerSize',12); axis padded equal;
set(gca,'XTick', 0);
set(gca,'YTick', 0);

%%
% rotate around com

% R_= @(phi) [eye(2) c; 0 0 1] * [R(phi) [0;0]; 0 0 1] * [eye(2) -c; 0 0 1];
R_ = @(phi) [R(phi) c-R(phi)*c; 0 0 1];

figure;
patch(p(1,:), p(2,:), [0 0 0.8]); axis padded equal;

pr = R_(20/180*pi) * [p; ones(1,size(p,2))];
hold on; patch(pr(1,:), pr(2,:), [0.4 0.4 0.7]);

pr = R_(50/180*pi) * [p; ones(1,size(p,2))];
patch(pr(1,:), pr(2,:), [0.6 0.6 0.7]);

pr = R_(80/180*pi) * [p; ones(1,size(p,2))];
patch(pr(1,:), pr(2,:), [0.9 0.9 1.0]);

axis equal; axis([-1 5 -1 5]);
plot(0,0,'ro');

plot(c(1),c(2),'gx','MarkerSize',12);
set(gca,'XTick', 0);
set(gca,'YTick', 0);

%%
% Generalized coord. rigid motion

q = [0; 0; 0];

T = @(q) [eye(2) [q(1); q(2)]; 0 0 1] * R_(q(3));
% T = @(q) [R(q(3)) [q(1); q(2)]+c-R(q(3))*c; 0 0 1];

figure;
h = patch(p(1,:), p(2,:), [0 0 0.8]); axis equal; axis([-1 5 -1 5]); hold on;
plot(c(1),c(2),'gx','MarkerSize',12);
set(gca,'XTick', 0);
set(gca,'YTick', 0);
% saveas(gcf, ['_img/rigidMotion_' num2str(0,'%04d') '.png']);

w = [-0.1; -0.1; 0.3]; % generalized velocity
for step = 1:20
    q = q + w;
    w(2) = w(2) + 0.01; % modify the velocity a bit

    p_ = T(q) * [p; ones(1,size(p,2))];
    c_ = T(q) * [c; 1];

    % p__ = R(q(3)) * p + q(1:2) + c - R(q(3))*c; % same as above
    % max(max(abs(p_(1:2,:)-p__)))

    set(h, 'XData', p_(1,:), 'YData', p_(2,:));
    plot(c_(1), c_(2), 'g.');
    drawnow; %pause(0.1);
    % saveas(gcf, ['_img/rigidMotion_' num2str(step,'%04d') '.png']);
end

%%
% Compute moment of inertia

Ic = 0;
for l=1:size(p,2)
    nl = l+1; if l==size(p,2), nl=1; end
    % connect each edge of the polygon to the centre of mass to form a triangle
    a = p(:,l)-c; b = p(:,nl)-c; % --> triangle (a,b,0)
    % integrate p^2 over this triangle --> bary. coords. p = u*a+v*b + (1-u-v)*0 --> integrate on reference triangle --> tri_area * ( a'*a + a'*b + b'*b ) / 24
    tri_area = 0.5*(a(1)*b(2)-a(2)*b(1));
    Ic = Ic + ( a'*a + a'*b + b'*b ) * (tri_area*2) / 12; % (tri_area*2) because we need A/A0 with A0=1/2 the reference triangle area
end

%%
% Rigid body motion

q = [0; 0; 0]; % generalized coordinates (x y phi)
v = [1; 1.5; 3]; % generalized velocities  (vx vy w)

figure;
plt = patch(p(1,:), p(2,:), [0 0 0.8]); axis equal; axis([-1 5 -1 5]); hold on;
%plot(c(1),c(2),'gx','MarkerSize',12);
set(gca,'XTick', 0);
set(gca,'YTick', 0);
% saveas(gcf, ['_img/rbSim_' num2str(0,'%04d') '.png']);

h = 1/30; % time step
for step = 1:120
    p_ = T(q) * [p; ones(1,size(p,2))];
    c_ = T(q) * [c; 1];
    x_ = p_(1,:);
    y_ = p_(2,:);
    set(plt, 'XData', x_, 'YData', y_);

    if  step==15 || step==30 % add a scripted impulse (= force * time step) at the k-th corner
        if  step==15, j_ = [0; -4]; k=1; end
        if  step==30, j_ = [-5; 0]; k=8; end
        tq = (p_(1,k)-c_(1)) * j_(2) - (p_(2,k)-c_(2)) * j_(1);
        v  = v + [j_/m; tq/Ic];
        
        qplt = quiver(p_(1,k), p_(2,k), j_(1), j_(2),'r', 'LineWidth',2);
        qpl2 = quiver(c_(1), c_(2), (p_(1,k)-c_(1)),(p_(2,k)-c_(2)) ,0,'w');
        % pause;
    end

    if  any( x_ < -1 ) % wall at x=-1
        k = find( x_ < -1, 1 );
        vk = v(3)*[0 -1; 1 0]*(p_(1:2,k)-c_(1:2)) + v(1:2); % velocity at corner k
        if  vk(1) < 0
            jx =-2* (v(3)*(-p_(2,k)+c_(2)) + v(1)) / ((-(p_(2,k)-c_(2)))*(-p_(2,k)+c_(2)) /Ic + 1 /m);
            j_ = [jx; 0]; % reflect velocity around x
    
            tq = (p_(1,k)-c_(1)) * j_(2) - (p_(2,k)-c_(2)) * j_(1);
            v  = v + [j_/m; tq/Ic];
            
            vk = v(3)*[0 -1; 1 0]*(p_(1:2,k)-c_(1:2)) + v(1:2);
            qplt=quiver(p_(1,k), p_(2,k), vk(1), vk(2),0.2,'g', 'LineWidth',2);
        end
    end
        
    if  any( y_ < -1 ) % wall at y=-1
        k = find( y_ < -1, 1 );
        vk = v(3)*[0 -1; 1 0]*(p_(1:2,k)-c_(1:2)) + v(1:2); % velocity at corner k
        if  vk(2) < 0
            jy =-2* (v(3)*(p_(1,k)-c_(1)) + v(2)) / (((p_(1,k)-c_(1)))*(p_(1,k)-c_(1)) /Ic + 1 /m);
            j_ = [0; jy]; % reflect velocity around y
    
            tq = (p_(1,k)-c_(1)) * j_(2) - (p_(2,k)-c_(2)) * j_(1);
            v  = v + [j_/m; tq/Ic];
            
            vk = v(3)*[0 -1; 1 0]*(p_(1:2,k)-c_(1:2)) + v(1:2);
            qplt=quiver(p_(1,k), p_(2,k), vk(1), vk(2),0.2,'g', 'LineWidth',2);
        end
    end

    q = q + h*v;

    drawnow; pause(h);
    % saveas(gcf, ['_img/rbSim_' num2str(step,'%04d') '.png']); 
    if exist('qplt'), delete(qplt); delete(qpl2); end
end