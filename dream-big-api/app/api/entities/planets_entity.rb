module Entities
  class PlanetsEntity < Grape::Entity
    expose :id
    expose :status
    expose :name
    expose :star_system_id
    expose :skin_id
  end
end