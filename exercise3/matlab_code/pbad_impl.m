clear all; clc; %#ok

t =@(q)  (q(1:3));
r =@(q)  (q(4:6));
R =@(q)  (rodriguesVectorToMatrix(r(q)));
Rt=@(q)  ([R(q) t(q) ; zeros(1,3) 1 ]);
Q =@(a,b)(Rt(a)'*Rt(b));
P =@(q,p)(R(q)*p+t(q));
mdot = @(A,B) ( sum(sum(A.*B)) ); % matrix scalar product A:B

rdt=1; % = (mass density)/(2*(time step)^2)
% extents of cube in rest space
x1=-0.5;x2=0.5; y1=-0.5;y2=0.5; z1=-0.5;z2=0.5;
M_= [
 -(rdt*(x1^3 - x2^3)*(y1 - y2)*(z1 - z2))/3, -(rdt*(x1^2 - x2^2)*(y1^2 - y2^2)*(z1 - z2))/4, -(rdt*(x1^2 - x2^2)*(z1^2 - z2^2)*(y1 - y2))/4, -(rdt*(x1^2 - x2^2)*(y1 - y2)*(z1 - z2))/2
 -(rdt*(x1^2 - x2^2)*(y1^2 - y2^2)*(z1 - z2))/4,     -(rdt*(y1^3 - y2^3)*(x1 - x2)*(z1 - z2))/3, -(rdt*(y1^2 - y2^2)*(z1^2 - z2^2)*(x1 - x2))/4, -(rdt*(y1^2 - y2^2)*(x1 - x2)*(z1 - z2))/2
 -(rdt*(x1^2 - x2^2)*(z1^2 - z2^2)*(y1 - y2))/4, -(rdt*(y1^2 - y2^2)*(z1^2 - z2^2)*(x1 - x2))/4,     -(rdt*(z1^3 - z2^3)*(x1 - x2)*(y1 - y2))/3, -(rdt*(z1^2 - z2^2)*(x1 - x2)*(y1 - y2))/2
 -(rdt*(x1^2 - x2^2)*(y1 - y2)*(z1 - z2))/2,     -(rdt*(y1^2 - y2^2)*(x1 - x2)*(z1 - z2))/2,     -(rdt*(z1^2 - z2^2)*(x1 - x2)*(y1 - y2))/2,         -rdt*(x1 - x2)*(y1 - y2)*(z1 - z2)
];

% contact plane
n=[0;0;1]; d=-1.99; k=0.3; % normal, offset, penalty factor
cd = @(qi,n)([ P(qi,[x1;y1;z1])'; P(qi,[x1;y1;z2])'; P(qi,[x1;y2;z1])'; P(qi,[x1;y2;z2])'; P(qi,[x2;y1;z1])'; P(qi,[x2;y1;z2])'; P(qi,[x2;y2;z1])'; P(qi,[x2;y2;z2])' ]*n)-d;
Ec=@(qi,k) (k*sum((cd(qi,n).*(cd(qi,n)<0)).^2)); % point-wise unilateral contact potential
Eg=@(qi) (0.001*n'*t(qi)); % hacky gravity potential, assumes centre of rotation coincides with centre of mass

E = @(qi,qj,qk) (Eg(qi) + Ec(qi,k) + mdot(  Q(qi,qi)-4*Q(qj,qi)+2*Q(qk,qi)  ,M_));

%%
% example simulation

% initial states at t=-1 and t=0
qk=[0;0;0; 0;0;0];
qj=[0.01;0;0; 0.05;0.01;0.02];


fdH=1e-5;
ed = [ % edges for drawing the cube
 1 1 2 3 5 5 6 7 1 2 3 4
 2 3 4 4 6 7 8 8 5 6 7 8
];
el = [ % triangles for drawing the cube
  1 2 5 6 1 5 3 7 1 2 5 6
  2 3 6 7 5 2 7 4 3 4 7 8
  3 4 7 8 2 6 4 8 5 6 3 4
]';


resplot=zeros(500,2);
for ti=1:500 % time step
    qi=qj;
    for k=1:50 % Newton solver
        f=fd_grad(qi,@(q)(E(q,qj,qk)),fdH);
        S=fd_hess(qi,@(q)(E(q,qj,qk)),fdH);
        dq = -S\f;
        qi = qi + dq; % add line search here
        if f'*f<1e-8, break; end % check convergence
    end
    resplot(ti,1)=f'*f;
    resplot(ti,2)=k;

    % clamp rotation vector magnitude
    if  norm(r(qi))>3/2*pi
        Ri0 = R(qi);
        ri_ = r(qi)./norm(r(qi));
        qi(4:6) = qi(4:6) - 2*pi*ri_;
        Rj0 = R(qj);
        rj_ = r(qj)./norm(r(qj));
        qj(4:6) = qj(4:6) - 2*pi*rj_;
        assert( max(max(abs( Ri0-R(qi) )))<1e-8 && max(max(abs( Rj0-R(qj) )))<1e-8 ,'bad rot!');
    end
    
    % update prior states
    qk=qj; qj=qi;
    k, qi %#ok output result
    
    
    % draw
    co = [
     P(qi,[x1;y1;z1])'
     P(qi,[x1;y1;z2])'
     P(qi,[x1;y2;z1])'
     P(qi,[x1;y2;z2])'
     P(qi,[x2;y1;z1])'
     P(qi,[x2;y1;z2])'
     P(qi,[x2;y2;z1])'
     P(qi,[x2;y2;z2])'
    ]; x=co(:,1); y=co(:,2); z=co(:,3);
    trimesh(el, x,y,z, 'FaceColor','b', 'FaceAlpha',0.7, 'EdgeAlpha',0); hold on;
    plot3(x(ed),y(ed),z(ed),'k','LineWidth',2);
    trimesh(el, x,y,0*z-2, 'FaceColor','k', 'FaceAlpha',0.3, 'EdgeAlpha',0); % basic shadow
    %quiver3( mean(x),mean(y),mean(z), mean(x)+qi(4)/pi,mean(y)+qi(5)/pi,mean(z)+qi(6)/pi,0 ); hold off;
    axis equal; axis([-1 6 -2 2 -2 2]); title(['t_i = ' num2str(ti) ', ||r|| = ' num2str(f'*f,'%.1e') ', k = ' num2str(k)]);
    camproj('perspective'); drawnow; hold off; %saveas(gcf,['_img/softcontactfrictionless_t' num2str( ti, '%d' ) '.jpg']);
end
%%
figure;
subplot(2,1,1); semilogy(resplot(:,1)); xlabel('time step'); ylabel('force residual');
subplot(2,1,2); plot(resplot(:,2)); ylabel('solver iters'); xticklabels([]);


function R = rodriguesVectorToMatrix(r)
    k_x = @(k) [0 -k(3) k(2) ; k(3) 0 -k(1) ; -k(2) k(1) 0]; % left cross matrix
    if  norm(r) < 1e-10
        R = eye(3) + k_x(r); % small angle approx. sin(x) ~ x (avoid div-by-zero)
    else
        R = eye(3) + sin(norm(r))*k_x(r/norm(r)) + (1-cos(norm(r)))*k_x(r/norm(r))*k_x(r/norm(r)); % Rodriguez rotation
    end
end


% gradient by central finite differencing
function dfdq = fd_grad(qi, f, fdH)
    dfdq=0*qi;
    for l=1:length(qi)
        tmp     = qi(l);
        qi(l)   = qi(l)+fdH;
        dfdq(l) = f(qi);
        qi(l)   = tmp;
        qi(l)   = qi(l)-fdH;
        dfdq(l) = (dfdq(l) - f(qi)) / (2*fdH);
        qi(l)   = tmp;
    end
end


% Hessian by central finite differencing
function ddfddq = fd_hess(qi, f, fdH)
    ddfddq=0*(qi*qi');
    for l=1:length(qi)
        tmp   = qi(l);
        qi(l) = qi(l)+fdH;
        ddfddq(:,l) = fd_grad(qi,f,fdH);
        qi(l) = tmp;
        qi(l) = qi(l)-fdH;
        ddfddq(:,l) = (ddfddq(:,l) - fd_grad(qi,f,fdH)) / (2*fdH);
        qi(l) = tmp;
    end
end
