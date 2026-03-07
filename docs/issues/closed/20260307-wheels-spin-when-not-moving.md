The wheels of the vehicle spin at a constant rotation not proportional to the speed of the vehicle.

Resolution note (2026-03-07): Fixed by driving wheel rotation from actual horizontal velocity
instead of elapsed time. Added regression coverage to keep stationary wheels still and scale spin
rate with speed.
