clear; clc;

c = [1; 2; 3];
% v = [.4; .5; .6];
% w = [.3; .9; .7];
v = [.0; .5; .0];
w = [.0; .9; .0];

[x,y,z]=meshgrid(0:0.4:4);

vx=0*x; vy=0*y; vz=0*z;

for i=1:size(x,1)
    for j=1:size(x,2)
        for k=1:size(x,3)
            p = [x(i,j,k); y(i,j,k); z(i,j,k)];

            dp= v + cross( w, p-c );

            vx(i,j,k) = dp(1); vy(i,j,k) = dp(2); vz(i,j,k) = dp(3);
        end
    end
end

quiver3(x,y,z, vx, vy, vz, 'filled', 'LineWidth', 1.4); axis equal;


%%

clear; clc;

c = [1; 2];
v = [.0; .0 ];
w = .9;

[x,y]=meshgrid(0:0.4:4);

vx=0*x; vy=0*y;

for step = 1:5
    for i=1:size(x,1)
        for j=1:size(x,2)
            p = [x(i,j); y(i,j)];
    
            dp= v + w *[0 -1; 1 0]*( p-c );
    
            vx(i,j) = dp(1); vy(i,j) = dp(2);
        end
    end
    
    hold off;
    quiver(x,y, vx, vy, 'filled', 'LineWidth', 1.4); axis equal; axis([-0.5 4.5 -0.5 4.5]);
    hold on; plot(c(1),c(2), 'ro');
    xlabel(['v = [' num2str(v(1),'%.1f') '; ' num2str(v(2),'%.1f') '];   \omega = ' num2str(w,'%.1f')]);

    set(gca,'XTick', []);
    set(gca,'YTick', []);
    drawnow; pause(0.1);
    %saveas(gcf, ['_img/velField_' num2str(step,'%04d') '.png']);

    v(1)=v(1) + 0.2;
    v(2)=v(2) + 0.4;
    w   =w    - 0.1;
end