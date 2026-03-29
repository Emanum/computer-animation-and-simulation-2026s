clear all; clc; %#ok

alpha = 20/180*pi;
 n = [sin(alpha) ; cos(alpha)];
 P = eye(2)-n*n';
fh = -0.25; % floor height
kn = 1e5; % floor penalty factor
kt = 1e7; % friction penalty factor
cf = 0.4; % friction coefficient
 t = linspace(0,1 ,1001); t=t(2:end); % time steps to compute

%% LCP solve
figure; hold on; set(gca, 'FontSize',24,'DefaultLineLineWidth',2, 'Color','k','XColor','w','YColor','w');
set(gcf, 'Color','k');

for cf=[ 0.1 0.3 0.6 ]

    g = [0; -9.81]; % gravity
    D = [n(2) -n(2); -n(1) n(1)]; % tangent directions (D'*n == 0!)

    ti=0; vi=[0; 0]; xi=[0; 0];
    xl=[];
    for ii=1:length(t)
        t1=t(ii);
        dt=t1-ti;

        % unconstrained step
        vt = [0; 0];
         r = vt-vi-dt*g;
        dr = eye(2);
        dv = -dr\r;
        vt = vt+dv;
        xt = xi+dt*vt;

        % collision detection
        if  0 > n'*xt-fh
            % LCP collision resolution
             r = vt-vi-dt*g;
            dr = eye(2);

            Si = dr\eye(2); % inverse system (mass) matrix
            M  = [
                n'*Si*n     n'*Si*D     0
                D'*Si*n     D'*Si*D     ones(2,1)
                   cf       -ones(1,2)     0
            ];
            q = [ 2*n'*vi-n'*Si*r  ;  D'*vi-D'*Si*r  ;  0 ];
            [w,z] = LCPSolve(M,q);
            lambda = z(1); beta = z(2:3); gamma = z(4);
            dv = Si*(n*lambda+D*beta-r);

    %         % frictionless version
    %         Si = inv(dr);
    %         M  = n'*Si*n;
    %          q = 2*n'*vi-n'*Si*r;
    %         [w,z,ret] = LCPSolve(M,q);
    %         lambda = z(1);
    %         dv = Si*(n*lambda-r);

            vt = vt+dv;
            xt = xi+dt*vt;
        end

        xi=xt; vi=vt; ti=t1;
        xl = [xl  xi]; %#ok
    end
    plot(xl(1,:),xl(2,:) );
end

% floor: n'*x = fh --->  x2 = (fh-n1*x1)/n2
x = [-0.1 1 ];%[ min(xb(1,:))-0.1 max(xb(1,:))+0.1];
plot(0,0,'ro', x, (fh-x*n(1))/n(2),'w','LineWidth',1); axis equal;

set(legend('µ = 0.1','µ = 0.3','µ = 0.6', 'Location','NorthEast'),'TextColor','w','Color',[0.2 0.2 0.2]);
% xlabel('x'); ylabel('y');
title('LCP','Color','w');

axis([-0.1 1 -0.55 0.1]);


%% Penalty BDF solve
figure; hold on; set(gca, 'FontSize',24,'DefaultLineLineWidth',2, 'Color','k','XColor','w','YColor','w');
set(gcf, 'Color','k');

for cf=[0.1 0.3 0.6]

    % normal penalty force and derivative
    fn= @(x) (-kn.*n.*(n'*x<fh).*(n'*x-fh));
    dfndx=@(x) (-kn.*n*n'.*(n'*x<fh));

    % friction penalty force and derivative
    ft= @(v,fn_) ((norm((kt*P*v))<=(cf*fn_))*(-kt*P*v) + (norm((kt*P*v))>(cf*fn_))*(norm(P*v)>0)*( -(cf*fn_)*P*v/(norm(P*v)+1e-30) ));
    dftdv = @(v,fn_,dfndx_) ((norm((kt*P*v))<=(cf*fn_))*(-kt*P) + (norm((kt*P*v))>(cf*fn_))*(norm(P*v)>0)*( -P*v/(norm(P*v)+1e-30)*cf*dfndx_ ));

    % acceleration with penalty force
    a = @(x,v) ([0; -9.81] +fn(x)+ft(v,n'*fn(x)));
    dadx = @(x,v) dfndx(x);
    dadv = @(x,v) dftdv(v,n'*fn(x),n'*dfndx(x));


    ti=0; vi=[0; 0]; xi=[0; 0];
    xb=[];
    for ii=1:length(t)
        t1=t(ii);
        dt=t1-ti;

        vt=[0; 0];
        if  1==ii % BDF1 step
            xt = xi + dt*vt;
            for iter=1:100
                r = vt-vi-dt*a(xt,vt);
                dr= eye(2)-dt*dt*dadx(xt,vt)-dt*dadv(xt,vt);
                dv = - dr\r;
                vt = vt+dv;
                xt = xi+dt*vt;
                if abs(dv)<1e-10, break; end
            end
        else  % BDF2 step
            xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
            for iter=1:100
                r = 1.5*(vt-vi) - 0.5*(vi-vm) - dt*a(xt,vt) ;
                dr= 1.5*eye(2) - dt*dt*dadx(xt,vt) - dt*dadv(xt,vt);
                dv = - dr\r;
                vt = vt+dv;
                xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
                if abs(dv)<1e-10, break; end
            end
        end
        if iter>3, disp([ii iter]); end
        xm=xi; vm=vi;
        xi=xt; vi=vt; ti=t1;
        xb = [xb  xi]; %#ok
    end
    plot(xb(1,:),xb(2,:) );

end

% floor: n'*x = fh --->  x2 = (fh-n1*x1)/n2
x = [-0.1 1 ];%[ min(xb(1,:))-0.1 max(xb(1,:))+0.1];
plot(0,0,'ro', x, (fh-x*n(1))/n(2),'w','LineWidth',1); axis equal;

set(legend('µ = 0.1','µ = 0.3','µ = 0.6', 'Location','NorthEast'),'TextColor','w','Color',[0.2 0.2 0.2]);
% xlabel('x'); ylabel('y');
title('BDF','Color','w');

axis([-0.1 1 -0.55 0.1]);
