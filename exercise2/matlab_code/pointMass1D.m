clear all; clc; %#ok


fh=-0.25; % floor height
kp=1e5; % floor penalty factor
t=linspace(0,0.75 ,1001); t=t(2:end); % time steps to compute

% acceleration with penalty force
a = @(x) (-9.81 - kp.*(x<fh).*(x-fh));
dadx = @(x) (-kp.*(x<fh));

figure; hold on; set(gca, 'FontSize',24,'DefaultLineLineWidth',2, 'Color','k','XColor','w','YColor','w');
set(gcf, 'Color','k')

ti=0; xi=0; vi=0;
xb1=[]; disp('BDF1 ...');
for ii=1:length(t)
    t1=t(ii);
    dt=t1-ti;
    
    %BDF1
    vt=0; xt = xi+dt*vt;
    for iter=1:100
        r = vi-vt+dt*a(xt);
        dr= dt*dt*dadx(xt)-1;
        dv = - r/dr;
        vt = vt+dv;
        xt = xi+dt*vt;
        if abs(dv)<1e-10, break; end
    end
    if iter>3, disp([ii iter]); end
    ti=t1; xi=xt; vi=vt;
    xb1 = [xb1; xi]; %#ok
end
plot(t,xb1,':' );


ti=0; vi=0; xi=0;
vm=0;xm=xi;% guess BDF2 start

xb2=[]; disp('BDF2 ...');
for ii=1:length(t)
    t1=t(ii);
    dt=t1-ti;
    
    vt=0;
    %BDF2
    xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
    for iter=1:100
        r = dt*a(xt) - 1.5*(vt-vi) + 0.5*(vi-vm);
        dr= dt*dt*dadx(xt)-1.5;
        dv = - r/dr;
        vt = vt+dv;
        xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
        if abs(dv)<1e-10, break; end
    end
    if iter>3, disp([ii iter]); end
    xm=xi; vm=vi;
    xi=xt; vi=vt; ti=t1;
    xb2 = [xb2; xi]; %#ok
end
plot(t,xb2,'-.' );

%%
% BDF with SQP contact ...

ti=0; vi=0; xi=0;
vm=0;xm=xi;

ag = a(xi);
gc = @(x) (x-fh); % gap function must be >0 --> x-fh > 0 -->  x > fh
dc = @(x) (1);
oopt = optimoptions(@quadprog,'Display','off','ConstraintTolerance',eps,'OptimalityTolerance',eps);

xbq=[]; disp('BDF/QP ...');
for ii=1:length(t)
    t1=t(ii);
    dt=t1-ti;
    
    vt=0;
    if  1%==ii % BDF1 step
        xt = xi + dt*vt;
        for iter=1:1%00
            r = (vt-vi)-dt*ag;
            dr=  1;
            g0=gc(xt); dg=dt*dc(xt);
            dv = quadprog(dr,r,-dg,g0,[],[],[],[],[],oopt);
            vt = vt+dv;
            xt = xi + dt*vt;
            if abs(dv)<1e-10, break; end
        end
    else %BDF2
        xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
        for iter=1:1%00
            r = dt*ag - 1.5*(vt-vi) + 0.5*(vi-vm);
            dr= -1.5;
            g0=gc(xt); dg=2/3*dt*dc(xt);
            dv = quadprog(-dr,-r,-dg,g0,[],[],[],[],[],oopt);
            vt = vt+dv;
            xt = xi + 2/3*dt*vt + 1/3*(xi-xm);
            if abs(dv)<1e-10, break; end
        end
    end
%     disp(iter);
    xm=xi; vm=vi;
    xi=xt; vi=vt; ti=t1;
    xbq = [xbq; xi]; %#ok
end
plot(t,xbq,'-' );

%%

% BDF1 with impact law


ti=0; xi=0; vi=0;
xbi=[]; disp('BDF1 IL ...');
for ii=1:length(t)
    t1=t(ii);
    dt=t1-ti;
    
    %BDF1
    vt=0; xt = xi+dt*vt; lambda=0;
    for iter=1:100
        r  = vt-vi-dt*ag;
        dr = 1;
        if  gc(xt)<0 && vt<0 % impact:   -dv<=2vi ==> (vt+vi)>=0
            [dv,~,~,~,lm] = quadprog(dr,r,-1,2*vi,[],[],[],[],[],oopt);
            lambda = lm.ineqlin; % store contact impulse
        else
            dv = dr\(lambda-r);
        end
        vt = vt+dv;
        xt = xi+dt*vt;
        if abs(dv)<1e-10, break; end
    end
    if iter>2, disp([ii iter]); end
    ti=t1; xi=xt; vi=vt;
    xbi = [xbi; xi]; %#ok
end
plot(t,xbi,'--' );



%%
plot(0,0,'ro', [0 t], 0*[0 t]+fh,'w-', [0 t], 0*[0 t],'w:', 'LineWidth',0.5);
axis([0 max(t) 1.1*min(xb1) -0.1*min(xb1)]);
hl=legend('BDF1','BDF2','BDF/QP','BDF1/IL', 'Location','SouthWest');
set(hl,'TextColor','w');
xlabel('Time'); ylabel('Height');
